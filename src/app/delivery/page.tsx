import { getDeliveryTrackingViewModel } from "@/components/delivery/delivery-mock-data";
import { DeliveryScreen } from "@/components/delivery/delivery-screen";

export default async function DeliveryPage() {
  const delivery = await getDeliveryTrackingViewModel();

  return <DeliveryScreen delivery={delivery} />;
}
