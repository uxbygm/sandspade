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
    <div>
      <h1>Command Runner</h1>

      <label>
        Email:
        <input type="email" value={email} onChange={handleEmailChange} placeholder="Enter your email" />
      </label>

      <div>
        <h3>Current Path: {path}</h3>
        <button onClick={() => setPath(path === "." ? ".." : path + "/..")}>Go Up</button>

        <div>
          {isLoadingFolders && <p>Loading Folders...</p>}
          {!isLoadingFolders && (
            <ul>
              {folders.map((folder) => (
                <li key={folder} onClick={() => setPath(`${path}/${folder}`)}>
                  {folder}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {packageJsonInfo?.exists && (
        <div>
          <h3>Project Info</h3>
          <p>
            <strong>Name:</strong> {packageJsonInfo.packageData.name}
          </p>
          <p>
            <strong>Version:</strong> {packageJsonInfo.packageData.version}
          </p>
        </div>
      )}

      <div>
        {packageJsonInfo?.exists && (
          <div>
            <h3>Actions</h3>
            <button onClick={() => runCommand("npm-install")} disabled={isRunningCommand}>
              Run npm install
            </button>
            <button onClick={() => runCommand("npm-audit")} disabled={isRunningCommand}>
              Run npm audit
            </button>
            <button disabled={isRunningCommand} onClick={() => runCommand("npm-audit-fix")}>
              Run audit fix
            </button>
          </div>
        )}
        <h3>Actions</h3>
        <button disabled={isRunningCommand} onClick={() => runCommand("remove-node-modules")}>
          Remove node_modules
        </button>

        <button disabled={isRunningCommand} onClick={() => runCommand("remove-lock-files")}>
          Remove lock files
        </button>
        <button disabled={isRunningCommand} onClick={() => runCommand("resync-git")}>
          Resync Git Repo
        </button>
      </div>

      <div>
        {isRunningCommand && <h3>Running Command...</h3>}
        {!isRunningCommand && (
          <>
            <h3>Command Output</h3>
            <pre>{output}</pre>
          </>
        )}
      </div>

      <div>
        <h3>Command Logs</h3>
        <ul>
          {logs.map((log, index) => (
            <li key={index}>
              <p>
                <strong>{log.description}:</strong> - {new Date(log.timestamp).toLocaleString()} - {log.email} - {log.resolvedPath}
              </p>
              <pre>{log.output}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
