const FRAMES = ["|", "/", "-", "\\"];
const FRAME_INTERVAL_MS = 80;

function canRenderSpinner(stream) {
  return Boolean(stream?.isTTY) && process.env.TERM !== "dumb";
}

function waitForRender() {
  return new Promise((resolve) => setImmediate(resolve));
}

export class Spinner {
  constructor(stream = process.stderr) {
    this.stream = stream;
    this.enabled = canRenderSpinner(stream);
    this.frameIndex = 0;
    this.message = "";
    this.timer = null;
    this.done = false;
  }

  render(prefix = FRAMES[this.frameIndex]) {
    if (!this.enabled || this.done) {
      return;
    }

    this.stream.write(`\r\x1b[2K${prefix} ${this.message}`);
  }

  start(message) {
    if (!this.enabled || this.done) {
      return;
    }

    this.message = message;
    this.render();

    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % FRAMES.length;
      this.render();
    }, FRAME_INTERVAL_MS);
  }

  setMessage(message) {
    if (!this.enabled || this.done) {
      return;
    }

    this.message = message;
    this.render();
  }

  async spinDuring(message, work) {
    if (!this.enabled || this.done) {
      return work();
    }

    if (this.timer) {
      this.setMessage(message);
    } else {
      this.start(message);
    }

    await waitForRender();
    return work();
  }

  stop(prefix, message) {
    if (!this.enabled || this.done) {
      return;
    }

    this.done = true;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.stream.write(`\r\x1b[2K${prefix} ${message}\n`);
  }

  succeed(message = this.message) {
    this.stop("+", message);
  }

  fail(message = this.message) {
    this.stop("x", message);
  }
}
