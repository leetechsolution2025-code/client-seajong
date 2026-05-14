import { StandardPage } from "@/components/layout/StandardPage";
import { InventoryManagement } from "@/components/finance/InventoryManagement";

export default function InventoryCheckPage() {
  return (
    <StandardPage
      title="Tra cứu tồn thực tế"
      description="Kiểm tra số lượng sẵn sàng bán theo thời gian thực"
      icon="bi-qr-code-scan"
      color="rose"
      useCard={false}
    >
      <InventoryManagement allowAdd={false} />
    </StandardPage>
  );
}
