import { execFile } from "node:child_process"

export function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], { timeout: 10_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`AppleScript failed: ${stderr || err.message}`))
      } else {
        resolve(stdout.trim())
      }
    })
  })
}

export function runJXA(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-l", "JavaScript", "-e", script], { timeout: 10_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`JXA failed: ${stderr || err.message}`))
      } else {
        resolve(stdout.trim())
      }
    })
  })
}
