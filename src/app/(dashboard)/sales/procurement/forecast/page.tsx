import DemandForecast from "@/components/sales/procurement/DemandForecast";
import { StandardPage } from "@/components/layout/StandardPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrandButton } from "@/components/ui/BrandButton";

export default function ForecastPage() {
  return (
    <StandardPage
      title="Dự báo nhu cầu mua hàng"
      icon="bi-graph-up-arrow"
      color="blue"
    >
      <DemandForecast />
    </StandardPage>
  );
}
