
import "./Toast.css";

function Toast({ message, type = "success", onClose }) {
    if (!message) return null;

    return (
        <div
            className={`toast toast-${type}`}
            role={type === "error" ? "alert" : "status"}
        >
            <span className="toast-icon">
                {type === "success" ? "✓" : type === "info" ? "i" : "!"}
            </span>

            <p>{message}</p>

            <button
                type="button"
                className="toast-close"
                onClick={onClose}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
}

export default Toast;
