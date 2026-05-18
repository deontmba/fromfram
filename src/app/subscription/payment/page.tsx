import { PaymentScreen } from "@/components/subscription/payment/payment-screen";

export default function PaymentPage() {
  return (
    <PaymentScreen
      midtransClientKey={process.env.MIDTRANS_CLIENT_KEY ?? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? null}
      isMidtransProduction={process.env.MIDTRANS_IS_PRODUCTION === "true"}
    />
  );
}
