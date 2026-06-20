import { Hammer } from "lucide-react";

export default function EmBreve({ titulo = "Em construção" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Hammer size={48} className="text-[#C8856A] mb-4" />
      <h1 className="font-display text-3xl text-[#3D2817]">{titulo}</h1>
      <p className="text-[#8B5E48] italic mt-2">Este módulo está sendo preparado e ficará disponível em breve.</p>
    </div>
  );
}
