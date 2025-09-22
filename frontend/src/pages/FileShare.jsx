// FileShare.js
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL); // Backend URL

function FileShare() {
  // refs
  const downloadFileRef = useRef(null);

  // states 
  const [file, setFile] = useState(null);
  const [fileURL, setFileURL] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [backendURL, setBackendURL] = useState(import.meta.env.VITE_BACKEND_URL);
  const [isJoined, setIsJoined] = useState(false);
  const [roomId, setRoomId] = useState("room1"); // default room (can be dynamic)

  // Join the room on component mount
  useEffect(() => {
    socket.on("file-shared", (data) => {
      setFileURL(`${backendURL}${data.url}`);
      setFileName(data.fileName);
      setFileType(data.fileType);
    });

    return () => {
      socket.off("file-shared");
    };
  }, [roomId]);


  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setFileType("");
  };

  const handleSendFile = () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("file-upload", {
        file: reader.result, // ArrayBuffer
        fileName: file.name,
        fileType: file.type,
        roomId: roomId, // pass roomId along with file
      });
    };
    reader.readAsArrayBuffer(file);
  };

 const downloadFile = (e) => {
  if (!fileURL || !fileName) return;
  fileURL.split('/uploads/')[1];

  fetch(`${backendURL}/download/${fileURL.split('/uploads/')[1]}`, {
    method: 'GET',
  }).then(response => {
    if (response.ok) {
      return response.blob();
    } else {
      throw new Error('Network response was not ok.');
    }
  }).then(blob => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  }).catch(error => {
    console.error('There was a problem with the fetch operation:', error);
  } );
  e.preventDefault();
  return false;

}


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-6">

        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-4">
          Real-Time File Sharing (Room: {roomId})
        </h1>

        {/* Room Selection */}
        {
          !isJoined && (
            <div className="mb-4 flex gap-2 items-center justify-center">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() =>{
               socket.emit("join-room", roomId);
               setIsJoined(true);
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
          >
            Join Room
          </button>
        </div>
          )
            
        }

        <p className="pb-4 text-center">{
        isJoined 
        ? <>
        <p>Joined <span className="font-bold">{roomId}</span></p>
        </> 
        : "Not Joined"}</p>

        {/* File Upload Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full sm:w-auto border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSendFile}
            className="w-full sm:w-auto px-5 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
          >
            Send File
          </button>
        </div>

        {/* File Preview Section */}
        {fileURL && (
          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">
              File Shared: {fileName}
            </h2>

            {/* File Preview */}
           <div className="w-full h-64 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
              {fileType.startsWith("image/") ? (
                <img
                  src={fileURL}
                  alt={fileName}
                  className="max-h-64 object-contain rounded-lg"
                />
              ) : (
                <embed src={fileURL} className="w-full h-full" />
              )}
            </div>

            {/* Buttons */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={fileURL}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition"
              >
                Full Preview
              </a>
              <a
              ref={downloadFileRef}
                onClick={downloadFile}
                className="px-5 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
              >
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileShare;
