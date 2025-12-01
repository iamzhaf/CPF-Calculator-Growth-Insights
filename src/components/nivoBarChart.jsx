import { ResponsiveBar } from "@nivo/bar";

export default function NivoBarChart({ data, color = "#4ade80" }) {
  // Function to format large numbers compactly (e.g., 1,234,567 -> 1.2M)
  const formatShortNumber = (value) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
    return value.toFixed();
  };

  // Function to format the tooltip value into currency
  const formatCurrency = (value) =>
    value.toLocaleString("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    });

  return (
    <div style={{ height: 300 }}>
      <ResponsiveBar
        data={data}
        keys={["amount"]}
        indexBy="id"
        // Reduced margins for a less cluttered look
        margin={{ top: 10, right: 10, bottom: 40, left: 55 }}
        padding={0.2}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        labelPosition="end"
        labelSkipWidth={12}
        labelSkipHeight={12}
        
        // --- Axes: Simplified and Cleaner ---
        axisBottom={{
          tickSize: 0, // Remove tick size for minimalist look
          tickPadding: 6,
          tickRotation: -45,
          legend: "", // Remove legend since parent component provides title
          legendPosition: "middle",
          legendOffset: 30,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          legend: "", // Remove legend
          legendPosition: "middle",
          legendOffset: -40,
          format: (formatShortNumber),
        }}
        
        // --- Grid and Layers ---
        gridYEnabled={true}
        gridXEnabled={false} // Typically not needed for bar charts
        
        // --- Labels: Disabled for cleaner chart, rely on tooltip ---
        enableLabel={false}

        // --- Colors and Styles ---
        colors={(bar) => color}
        borderRadius={5} // Slightly smoother corners
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        
        // --- Interactivity: Improved Hover Effect ---
        // Add a darker shade on hover
        theme={{
            axis: {
                ticks: { line: { stroke: "#5a5a5aff" } }, // Lighten the tick lines
                legend: { text: { fontSize: 20, fill: "#64748b", fontWeight: 900 } },
                
            },
            grid: {
                line: { stroke: "#676869ff", strokeDasharray: "2 2" } // Light dashed grid lines
            },
            tooltip: {
                container: { 
                    fontSize: 20, 
                    fontWeight: 600,
                    borderRadius: 6,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
                    padding: "8px 12px"
                },
            }
        }}
        
        // Layer to ensure clean rendering over grid
        layers={['grid', 'axes', 'bars']}
        
        // Custom tooltip for better formatting
        tooltip={({ indexValue, value }) => (
          <div
            style={{
              backgroundColor: '#e6e5e5ff',
              borderRadius: 6,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)",
              padding: "8px 12px"
            }}
          >
            <div style={{ fontSize: 15, color: '#000000' }}>
              {indexValue}
            </div>
            <div>
              <strong style={{ color: '#000000' }}>
                {formatCurrency(value)}
              </strong>
            </div>
          </div>
        )}
        
        // --- Animation ---
        animate={true}
        motionConfig="stiff" // More impactful animation
      />
    </div>
  );
}