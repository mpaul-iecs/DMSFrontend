import { toast as toastify, type ToastContainerProps, type ToastOptions } from "react-toastify";

/**
 * Single place to tune every toast in the app — position, timing, look.
 * Uses react-toastify's own default rendering (colored theme) since custom
 * content broke sizing for short messages; consumed by
 * <ToastContainer {...TOAST_CONTAINER_CONFIG} /> in App.tsx.
 */
export const TOAST_CONTAINER_CONFIG: ToastContainerProps = {
  position: "top-right",
  autoClose: 3500,
  newestOnTop: true,
  closeOnClick: true,
  pauseOnHover: true,
  theme: "colored",
};

/**
 * App-wide toast API — call `toast.success("Saved")`, `toast.error("Something broke")`, etc.
 * Position/timing/theme live in TOAST_CONTAINER_CONFIG above — change it in exactly one place.
 */
const toast = {
  success: (message: string, options?: ToastOptions) => toastify.success(message, options),
  error: (message: string, options?: ToastOptions) => toastify.error(message, options),
  warning: (message: string, options?: ToastOptions) => toastify.warning(message, options),
  info: (message: string, options?: ToastOptions) => toastify.info(message, options),
};

export default toast;
