import { useState } from "react";
import OverviewPanel from "../components/overview/OverviewPanel";
import MessageBar from "../components/layout/MessageBar";
import { useSearchWorkspace } from "../hooks/useSearchWorkspace";

export default function OverviewContainer() {
  const [msg, setMsg] = useState({ text: "数据看板已就绪。", error: false });
  const { search, loading } = useSearchWorkspace();

  return (
    <>
      <MessageBar msg={msg} />
      <OverviewPanel
        search={search}
        loading={loading}
      />
    </>
  );
}