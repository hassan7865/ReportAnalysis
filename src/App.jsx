import { useState } from "react";
import * as XLSX from "xlsx";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [date, setDate] = useState(null);

  const handleFileUpload = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (!file || !date) {
      setLoading(false);
      toast.error("No file or date selected. Please choose both.", {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);

          if (!jsonData || jsonData.length === 0) {
            throw new Error("No valid data found in the file.");
          }

          const total = {}; // Grand total for each day bucket
          const pivotResult = {};

          jsonData.forEach((record) => {
            const destination = record.Destination;
            const days = getDaysSinceBooking(record);
            const bucket = getDayBucket(days);

            if (!bucket || bucket === "Invalid days") return;

            if (!pivotResult[destination]) {
              pivotResult[destination] = {};
            }

            pivotResult[destination][bucket] = (pivotResult[destination][bucket] || 0) + 1;
            total[bucket] = (total[bucket] || 0) + 1;
          });

          total["Grand Total"] = Object.values(total).reduce((sum, val) => sum + val, 0);

          // **Sorting Logic**: Extract keys, sort numerically
          const sortedBuckets = Object.keys(total)
            .filter((key) => key !== "Grand Total")
            .sort((a, b) => {
              if (a === "30+ Days") return 1;
              if (b === "30+ Days") return -1;
              return parseInt(a) - parseInt(b);
            });

          // Ensure column order: Destination first, followed by day buckets, then Grand Total
          const columnOrder = ["Destination", ...sortedBuckets, "Grand Total"];

          const pivotArray = Object.entries(pivotResult).map(([destination, data]) => {
            const row = { Destination: destination };
            sortedBuckets.forEach((bucket) => {
              row[bucket] = data[bucket] || 0;
            });
            row["Grand Total"] = Object.values(data).reduce((sum, val) => sum + val, 0);
            return row;
          });

          // **Grand Total row at the END**
          const grandTotalRow = {
            Destination: "Grand Total",
          };
          sortedBuckets.forEach((bucket) => {
            grandTotalRow[bucket] = total[bucket] || 0;
          });
          grandTotalRow["Grand Total"] = total["Grand Total"];
          pivotArray.push(grandTotalRow);

          const wb = XLSX.utils.book_new();
          const ws = XLSX.utils.json_to_sheet(pivotArray, { header: columnOrder });
          XLSX.utils.book_append_sheet(wb, ws, "Report");

          XLSX.writeFile(wb, `Report_${new Date().toISOString()}.xlsx`);

          toast.success("Report generated successfully!");
        } catch (error) {
          toast.error(error.message || "Error processing the file.");
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("Error reading the file. Please try again.");
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error("Unexpected error occurred.");
      setLoading(false);
    }
  };

  function getDaysSinceBooking(record) {
    const startDate = new Date(date);
    const bookingDate = new Date(record["Booking Date"]);
    const diffMs = bookingDate - startDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function getDayBucket(days) {
    if (days < 0) return "Invalid days";
    if (days <= 29) return `${days} Day${days === 1 ? "" : "s"}`;
    return "30+ Days";
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
      <input className="form-control" type="date" onChange={(e)=>setDate(e.target.value)}></input>
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
