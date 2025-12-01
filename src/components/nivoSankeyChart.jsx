import { ResponsiveSankey } from "@nivo/sankey";

export default function NivoSankeyChart({ data }) {
  const formatCurrency = (value) =>
    value.toLocaleString("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    });

  const CPF_COLORS = {
    "Employee Contribution": "#465ec1ff",
    "Employer Contribution": "#6fc0e3ff",
    "Total Contribution": "#025d1aff",
    OA: "#0f397eff",
    SA: "#14c087ff",
    MA: "#f59e0b",
    "Starting CPF Balance": "#025d1aff",
    "Total Interest": "#a62b2bff",
  };

  return (
    <div style={{ height: "560px", width: "100%" }}>
      <ResponsiveSankey
        data={data}
        margin={{ top: 30, right: 80, bottom: 30, left: 80 }}
        nodeOpacity={1}
        nodeThickness={20}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        nodeAlign="justify"
        linkOpacity={0.3}
        linkBlendMode="multiply"
        layout="horizontal"
        sort="input"
        colors={({ id }) => CPF_COLORS[id] || "#000000"}
        linkColorScheme="target"
        theme={{
          labels: {
            text: { fontSize: 16, fontWeight: 700, fill: "#0f172a" },
          },
          tooltip: { container: { padding: "8px 12px", fontSize: 12 } },
        }}
        enableLabels={true}
        label={(node) => {
          if (node.id === "Employee Contribution") {
            return `${formatCurrency(node.value)} (Your Contributions)`;
          } else if (node.id === "Employer Contribution") {
            return `${formatCurrency(node.value)} (Employer Contributions)`;
          } else if (node.id === "Total Contribution") {
            return `${formatCurrency(node.value)} (Total Contributions)`;
          } else if (node.id === "OA") {
            return `${formatCurrency(node.value)} (OA)`;
          } else if (node.id === "SA") {
            return `${formatCurrency(node.value)} (SA)`;
          } else if (node.id === "MA") {
            return `${formatCurrency(node.value)} (MA)`;
          } else if (node.id === "Total Interest") {
            return `${formatCurrency(node.value)} (CPF Interest)`;
          } else if (node.id === "Starting CPF Balance") {
            return `${formatCurrency(node.value)} (Starting Balance)`;
          }
          return formatCurrency(node.value);
        }}
        labelPosition="inside"
        labelOrientation="horizontal"
        labelPadding={10}
        labelTextColor={{ from: "color", modifiers: [["darker", 8]] }}

        // ✅ Use these instead of `tooltip`
        nodeTooltip={({ node }) => (
          <div style={{ padding: "4px 8px" }}>
            <strong>{node.id}: </strong>
            <span style={{ color: CPF_COLORS[node.id] }}>
              {formatCurrency(node.value)}
            </span>
          </div>
        )}
        linkTooltip={({ link }) => (
          <div style={{ padding: "4px 8px", fontSize: "12px",width: "100px" }}>
            <p style={{ fontWeight: "bold", color: "#000000" }}>{link.source.id} to {link.target.id}</p>
            <p style={{ color: CPF_COLORS[link.source.id] }}>
              <strong>{formatCurrency(link.value)}</strong>
            </p>
          </div>
        )}

        animate={true}
        motionConfig="stiff"
      />
    </div>
  );
}
