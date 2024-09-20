const express = require("express");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const app = express();

const config = require("./config.json");

app.use(express.json());

const LOG_FILE_PATH = path.join(__dirname, "logs.json");

const checkForPackageJson = (resolvedPath) => {
  const packageJsonPath = path.join(resolvedPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return { exists: true, packageData: packageJsonData };
  } else {
    return { exists: false };
  }
};

const readLogsFromFile = () => {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    return [];
  }
  const logsData = fs.readFileSync(LOG_FILE_PATH);
  return JSON.parse(logsData.toString());
};

const writeLogsToFile = (logs) => {
  fs.writeFileSync(LOG_FILE_PATH, JSON.stringify(logs, null, 2));
};

let commandLogs = readLogsFromFile();

app.get("/api/folders", (req, res) => {
  const folderPath = req.query.path;

  const resolvedPath = path.resolve(folderPath);

  fs.readdir(resolvedPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const folders = files.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    const packageJsonInfo = checkForPackageJson(resolvedPath);

    res.json({ folders, packageJson: packageJsonInfo });
  });
});

const runCommand = (cmd, description, email, resolvedPath, commandPath, commandStatus) => {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: resolvedPath }, (error, stdout, stderr) => {
      const result = {
        description,
        success: !error,
        output: stdout || stderr,
        stderr: stderr,
        timestamp: new Date(),
        email: email,
        resolvedPath: resolvedPath,
        commandPath: commandPath,
        commandStatus: commandStatus,
      };

      commandLogs.push(result);
      writeLogsToFile(commandLogs);

      if (error) {
        console.error(`Error executing command: ${cmd}`, error);
        console.error(stderr);
        reject(result);
      } else {
        resolve(result);
      }
    });
  });
};

app.post("/api/run-command", async (req, res) => {
  const { action, path: folderPath, email } = req.body;

  const commandPath = folderPath;
  const resolvedPath = path.resolve(folderPath);

  const cmd = `cd ${resolvedPath} && ${action}`;
  console.log(`Running command: ${cmd}`);

  console.log(`commandPath: ${commandPath}`);
  console.log(`------`);

  const commandStatus = "New";

  try {
    let result;
    switch (action) {
      case "remove-node-modules":
        result = await runCommand(`rm -rf ${resolvedPath}/node_modules`, "Remove node_modules", email, resolvedPath, commandPath, commandStatus);
        break;
      case "npm-init":
        result = await runCommand(`npm init`, "Run npm init", email, resolvedPath, commandPath, commandStatus);
        break;
      case "npm-install":
        result = await runCommand(`npm install`, "Run npm install", email, resolvedPath, commandPath, commandStatus);
        break;
      case "npm-audit":
        result = await runCommand(`npm audit`, "Run npm audit", email, resolvedPath, commandPath, commandStatus);
        break;
      case "npm-audit-fix":
        result = await runCommand(`npm audit fix`, "Run npm audit fix", email, resolvedPath, commandPath, commandStatus);
        break;
      case "remove-lock-files":
        result = await runCommand(`rm ${resolvedPath}/package-lock.json ${resolvedPath}/yarn.lock`, "Remove lock files", email, resolvedPath, commandPath, commandStatus);
        break;
      case "resync-git":
        result = await runCommand(`git fetch --all && git reset --hard origin/main`, "Resync Git repo", email, resolvedPath, commandPath, commandStatus);
        break;
      default:
        return res.status(400).json({
          error: "Unknown action",
          email,
          resolvedPath,
          commandPath,
          commandStatus,
        });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json(error);
  }
});

app.get("/api/logs", (req, res) => {
  res.json(commandLogs);
});

app.use(express.static(path.join(__dirname, "ui", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "ui", "build", "index.html"));
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
