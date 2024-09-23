import React, { useState, useEffect } from "react";
import axios from "axios";


function App() {
  const [path, setPath] = useState(".");
  const [folders, setFolders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [output, setOutput] = useState("");
  const [email, setEmail] = useState("");
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isRunningCommand, setIsRunningCommand] = useState(false);
  const [packageJsonInfo, setPackageJsonInfo] = useState(null); // Holds package.json data

  useEffect(() => {
    loadFolders();
    loadLogs();
    loadEmailFromStorage();
  }, [path]);

  const loadEmailFromStorage = () => {
    const savedEmail = localStorage.getItem("email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  };
  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    localStorage.setItem("email", newEmail);
  };

  const loadFolders = async () => {
    setIsLoadingFolders(true);

    try {
      const response = await axios.get(`/api/folders?path=${path}`);
      setFolders(response.data.folders);
      setPackageJsonInfo(response.data.packageJson);
    } catch (error) {
      console.error("Error loading folders:", error);
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const loadLogs = async () => {
    const response = await axios.get("/api/logs");
    setLogs(response.data);
  };

  const runCommand = async (action) => {
    setIsRunningCommand(true);
    setOutput("");

    try {
      const response = await axios.post("/api/run-command", { action, path, email });
      setOutput(response.data.output);
      loadLogs(); // refresh logs after running a command
    } catch (error) {
      setOutput(error.response?.data?.output || "Command failed");
    } finally {
      setIsRunningCommand(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-200  h-screen overflow-y-auto">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-5">
          <h1 className="text-2xl font-bold text-blue-500">Command Runner</h1>
          <label className="block mt-4">
            Email:
            <input
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            />
          </label>
        </div>
        <div className="p-5">
          <h3 className="font-semibold">Folders</h3>
          <button className="mt-2 bg-blue-500 text-white py-1 px-3 rounded" onClick={() => setPath(path === "." ? ".." : path + "/..")}>
            Go Up
          </button>
          <div className="mt-2">
            {isLoadingFolders ? (
              <p>Loading Folders...</p>
            ) : (
              <ul>
                {folders.map((folder) => (
                  <li key={folder} className="cursor-pointer hover:text-blue-500" onClick={() => setPath(`${path}/${folder}`)}>
                    {folder}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-5">
        <h2 className="text-3xl font-bold">Current Path: {path}</h2>

        {packageJsonInfo?.exists && (
          <div className="mt-4 bg-white p-4 rounded shadow">
            <h3 className="font-semibold">Project Info</h3>
            <p><strong>Name:</strong> {packageJsonInfo.packageData.name}</p>
            <p><strong>Version:</strong> {packageJsonInfo.packageData.version}</p>
          </div>
        )}

        <div className="mt-4 bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Actions</h3>
          {packageJsonInfo?.exists ? (
            <>
              <button className="bg-blue-500 text-white py-1 px-3 rounded" onClick={() => runCommand("npm-install")} disabled={isRunningCommand}>Run npm install</button>
              <button className="bg-blue-500 text-white py-1 px-3 rounded" onClick={() => runCommand("npm-audit")} disabled={isRunningCommand}>Run npm audit</button>
              <button className="bg-blue-500 text-white py-1 px-3 rounded" onClick={() => runCommand("npm-audit-fix")} disabled={isRunningCommand}>Run audit fix</button>
            </>
          ) : (
            <button className="bg-blue-500 text-white py-1 px-3 rounded" onClick={() => runCommand("npm-init")} disabled={isRunningCommand}>Run npm init</button>
          )}
          <button className="mt-2 bg-red-500 text-white py-1 px-3 rounded" disabled={isRunningCommand} onClick={() => runCommand("remove-node-modules")}>Remove node_modules</button>
          <button className="mt-2 bg-red-500 text-white py-1 px-3 rounded" disabled={isRunningCommand} onClick={() => runCommand("remove-lock-files")}>Remove lock files</button>
          <button className="mt-2 bg-green-500 text-white py-1 px-3 rounded" disabled={isRunningCommand} onClick={() => runCommand("resync-git")}>Resync Git Repo</button>
        </div>

        <div className="mt-4 bg-white p-4 rounded shadow">
          {isRunningCommand ? <h3>Running Command...</h3> : (
            <>
              <h3 className="font-semibold">Command Output</h3>
              <pre className="bg-gray-100 p-2 rounded">{output}</pre>
            </>
          )}
        </div>

        <div className="mt-4 bg-white p-4 rounded shadow">
          <h3 className="font-semibold">Command Logs</h3>
          <ul>
            {logs.map((log, index) => (
              <li key={index} className="border-b py-2">
                <p>
                  <strong>{log.description}:</strong> - {new Date(log.timestamp).toLocaleString()} - {log.email} - {log.resolvedPath}
                </p>
                <pre className="bg-gray-100 p-2 rounded">{log.output}</pre>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
