let shuttingDown = false;

export function isShuttingDown() {
  return shuttingDown;
}

export function setShuttingDown(value: boolean) {
  shuttingDown = value;
}
