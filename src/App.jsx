import { useState } from "react";
import * as XLSX from "xlsx";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [File, setFile] = useState(null);
  const [date,setdate] = useState(null)
  const handleFileUpload = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (File && Date) {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet);

        if (jsonData && jsonData.length > 0) {
          const total = {
            "0-5 Days": 0,
            "6-10 Days": 0,
            "11-20 Days": 0,
            "21-30 Days": 0,
            "30+ Days": 0,
            "Grand Total": 0,
          };
          const pivotResult = jsonData.reduce((acc, record) => {
            const destination = record.Destination;
            const days = getDaysSinceBooking(record);
            const bucket = getDayRangeBucket(days);

            if (!acc[destination]) {
              acc[destination] = {
                "0-5 Days": 0,
                "6-10 Days": 0,
                "11-20 Days": 0,
                "21-30 Days": 0,
                "30+ Days": 0,
                "Grand Total": 0,
              };
            }

            total[bucket] += 1;
            total["Grand Total"] += 1;
            acc[destination][bucket] += 1;
            acc[destination]["Grand Total"] += 1;

            return acc;
          }, {});

          const pivotArray = Object.entries(pivotResult).map(
            ([destination, data]) => ({
              Destination: destination,
              "0-5 Days": data["0-5 Days"],
              "6-10 Days": data["6-10 Days"],
              "11-20 Days": data["11-20 Days"],
              "21-30 Days": data["21-30 Days"],
              "30+ Days": data["30+ Days"],
              "Grand Total": data["Grand Total"],
            })
          );

          const grandTotalRow = [
            {
              Category: "Grand Total",
              "0-5 Days": total["0-5 Days"],
              "6-10 Days": total["6-10 Days"],
              "11-20 Days": total["11-20 Days"],
              "21-30 Days": total["21-30 Days"],
              "30+ Days": total["30+ Days"],
              Total: total["Grand Total"],
            },
          ];

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(pivotArray);

       
          XLSX.utils.book_append_sheet(wb, ws, "Report");

          
          XLSX.utils.sheet_add_json(ws, grandTotalRow, {
            skipHeader: true,
            origin: -1,
          });
          XLSX.writeFile(wb, `Report${new Date().getSeconds().toString()}.xlsx`);

          setLoading(false)
        } else {
          toast.error("No valid data found in the file.", {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "light",
          });
        }
        setLoading(false);
      };

      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setLoading(false);
        toast.error("Error reading the file. Please try again.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
        });
      };

      reader.readAsArrayBuffer(File);
    } else {
      setLoading(false);
      toast.error("No file selected. Please choose a file to upload.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  };

  function getDaysSinceBooking(record) {
    const today = new Date(date);
    const bookingDate = new Date(record["Booking Date"]);
    const diffMs = today - bookingDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function getDayRangeBucket(days) {
    if (days >= 0 && days <= 5) return "0-5 Days";
    if (days >= 6 && days <= 10) return "6-10 Days";
    if (days >= 11 && days <= 20) return "11-20 Days";
    if (days >= 21 && days <= 30) return "21-30 Days";
    if (days > 30) return "30+ Days";
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <h3>Upload Excel File</h3>
      <input className="form-control" type="date" onChange={(e)=>setdate(e.target.value)}></input>
      <input
        type="file"
        className="form-control"
        onChange={(e) => setFile(e.target.files[0])}
        accept=".xlsx, .xls"
      />

      <button
        onClick={handleFileUpload}
        type="button"
        className="btn btn-primary btn-block w-100"
      >
        {loading ? "Loading..." : "Upload"}
      </button>
    </>
  );
}

export default App;
