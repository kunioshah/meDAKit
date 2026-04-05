export function PlusBackground() {
  // Create a grid of plus symbols
  const plusSymbols = [];
  const columns = 20;
  const rows = 30;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      plusSymbols.push({ id: `${row}-${col}`, row, col });
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* First layer */}
      <div className="absolute animate-scroll-vertical" style={{ top: 0, left: 0, right: 0 }}>
        <div 
          className="grid gap-x-20 gap-y-16 p-8"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {plusSymbols.map(({ id }) => (
            <div
              key={id}
              className="text-4xl text-gray-300/20 flex items-center justify-center"
            >
              +
            </div>
          ))}
        </div>
      </div>
      
      {/* Second layer for seamless loop */}
      <div className="absolute animate-scroll-vertical-delayed" style={{ top: 0, left: 0, right: 0 }}>
        <div 
          className="grid gap-x-20 gap-y-16 p-8"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
          }}
        >
          {plusSymbols.map(({ id }) => (
            <div
              key={`dup-${id}`}
              className="text-4xl text-gray-300/20 flex items-center justify-center"
            >
              +
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}