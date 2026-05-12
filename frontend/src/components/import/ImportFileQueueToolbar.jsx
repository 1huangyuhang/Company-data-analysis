import useExcelQueueInput from "../../hooks/useExcelQueueInput";
import { formatFileSize } from "../../utils/fileQueue";

/**
 * Excel 待上传队列：与父级表单解耦，不包在 <form> 内，避免选择文件与 submit 语义冲突。
 */
export default function ImportFileQueueToolbar({ pendingFiles, onAddPendingFiles, onRemovePendingFile, onUploadQueue }) {
  const { inputRef, openFilePicker, onInputChange } = useExcelQueueInput(onAddPendingFiles);

  const handleUpload = () => {
    onUploadQueue();
  };

  return (
    <div className="card import-file-queue-card">
      <div className="file-upload-toolbar">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="sr-only-input"
          tabIndex={-1}
          aria-hidden="true"
          onChange={onInputChange}
        />
        <button type="button" className="secondary file-queue-trigger" onClick={openFilePicker}>
          选择文件（可多选）
        </button>
        <button type="button" disabled={!pendingFiles.length} onClick={handleUpload}>
          上传并导入队列
        </button>
      </div>
      {pendingFiles.length > 0 ? (
        <ul className="pending-file-list" aria-label="待导入文件队列">
          {pendingFiles.map((entry) => {
            const ok = entry.file instanceof File;
            return (
              <li key={entry.key} className="pending-file-item">
                <span className="pending-file-name" title={ok ? entry.file.name : ""}>
                  {ok ? entry.file.name : "（文件引用已失效，已从队列移除）"}
                </span>
                <span className="pending-file-meta">{ok ? formatFileSize(entry.file.size) : "—"}</span>
                <button type="button" className="secondary pending-file-remove" onClick={() => onRemovePendingFile(entry.key)}>
                  移除
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint-text">选择多个 Excel 后将在此以列表展示；可单独移除。点击「上传并导入队列」后按顺序导入数据库。</p>
      )}
    </div>
  );
}
