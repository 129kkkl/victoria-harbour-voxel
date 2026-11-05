// Yield a task without tying initialization to animation frames. Embedded and
// background tabs can pause rAF; MessageChannel still lets the boot work advance.
export function yieldToBrowser() {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close(); channel.port2.close(); resolve();
    };
    channel.port2.postMessage(null);
  });
}
