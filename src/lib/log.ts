import toast from "svelte-french-toast";

export const log = {
  log(...args: unknown[]) {
    console.log(...args);
    toast(joinLog(args));
  },
  error(...args: unknown[]) {
    console.error(...args);
    toast.error(joinLog(args));
  },
};

function joinLog(args: unknown[]) {
  return args.join(" ");
}
