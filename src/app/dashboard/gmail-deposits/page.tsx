import { GmailDepositsBoard } from "@/components/dashboard/gmail-deposits-board";

export const metadata = {
  title: "Bandeja de Depósitos Gmail | HispaniolaPay",
  description: "Tablero de lectura automática de depósitos bancarios desde Banreservas, Banco BHD y Banco Popular vía Gmail para remesas a Haití.",
};

export default function GmailDepositsPage() {
  return (
    <div className="space-y-6">
      <GmailDepositsBoard />
    </div>
  );
}
