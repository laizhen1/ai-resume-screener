"use client";
import { useState } from "react";
export function ModelStatus() {
 const [status,setStatus]=useState("Not checked"); const [busy,setBusy]=useState(false);
 async function check(){ setBusy(true); try {const response=await fetch("/api/model-status"); if(!response.ok) throw new Error(); const data=await response.json();setStatus(data.model+": "+data.status+" ("+data.elapsedMs+" ms)");}catch{setStatus("Readiness check unavailable");}finally{setBusy(false);}}
 return <div className="semantic-note"><button type="button" className="secondary" disabled={busy} onClick={check}>{busy?"Checking model…":"Check model readiness"}</button><p role="status" aria-label="Model readiness">{status}</p><small>Readiness confirms installation and reachability; generation can still fail.</small></div>;
}
