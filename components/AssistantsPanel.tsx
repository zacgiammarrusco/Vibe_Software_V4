
'use client';
const items = [
  { name:"Notebooks", count:0 },
  { name:"Screens", count:1 },
  { name:"Mobile Devices", count:0 },
  { name:"License Plates", count:0 },
  { name:"Heads", count:0 },
];
export default function AssistantsPanel(){
  return (
    <aside className="sidebar w-72 p-3 hidden lg:flex flex-col gap-2">
      <div className="font-semibold mb-1">Assistants</div>
      {items.map((it,i)=> (
        <div key={i} className="flex items-center justify-between card px-3 py-2">
          <div>{it.name}</div>
          <div className="badge">{it.count}</div>
        </div>
      ))}
    </aside>
  );
}
