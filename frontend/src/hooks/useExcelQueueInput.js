import { useCallback, useRef } from "react";

/**
 * 隐藏 file input + 程序化 click，避免 label/for 与外层 form 在部分环境下无法弹出系统文件框。
 * @param {(list: FileList) => void} onAddFiles
 */
export default function useExcelQueueInput(onAddFiles) {
  const inputRef = useRef(null);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e) => {
      const list = e.target.files;
      if (list?.length) onAddFiles(list);
      e.target.value = "";
    },
    [onAddFiles]
  );

  return { inputRef, openFilePicker, onInputChange };
}
