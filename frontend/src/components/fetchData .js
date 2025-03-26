import React, { useEffect, useState } from "react";
import { fetchData } from "./api";

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData()
      .then((data) => setData(data))
      .catch((error) => console.error("Error:", error));
  }, []);

  return (
    <div>
      <h1>Data from Backend</h1>
      {data ? <p>{data.message}</p> : <p>Loading...</p>}
    </div>
  );
}

export default App;
