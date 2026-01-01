// POS & KOT Templates for Invoice Preview
// Thermal printer formats: 58mm, 80mm, KOT

// POS 58mm Template - Thermal Receipt (220px = 58mm)
export function POS58mmTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[220px] text-[10px] font-mono bg-white p-2">
      {/* Header */}
      <div className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-xs">{data.companyName || 'YOUR BUSINESS'}</div>
        <div className="text-[9px] mt-0.5">{data.companyPhone}</div>
        <div className="text-[9px]">GSTIN: {data.companyGstin || 'N/A'}</div>
      </div>

      {/* Invoice Info */}
      <div className="border-b border-dashed border-black pb-1 mb-1">
        <div className="flex justify-between text-[9px]">
          <span>Bill#: {data.invoiceNumber}</span>
          <span>{data.invoiceDate}</span>
        </div>
        <div className="text-[9px]">Customer: {data.customerName}</div>
        {data.customerPhone && <div className="text-[9px]">Ph: {data.customerPhone}</div>}
      </div>

      {/* Items */}
      <div className="border-b border-dashed border-black pb-1 mb-1">
        {data.items.map((item: any, i: number) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between font-semibold">
              <span>{item.name}</span>
              <span>₹{item.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[9px] text-gray-600">
              <span>{item.quantity} x ₹{item.price.toFixed(2)}</span>
              <span>{item.gst || 0}% GST</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b border-dashed border-black pb-1 mb-1">
        <div className="flex justify-between text-[9px]">
          <span>Subtotal:</span>
          <span>₹{data.subtotal.toFixed(2)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-[9px]">
            <span>Discount:</span>
            <span>-₹{data.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-[9px]">
          <span>Tax (GST):</span>
          <span>₹{data.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-xs mt-1">
          <span>TOTAL:</span>
          <span>₹{data.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment */}
      {data.received > 0 && (
        <div className="border-b border-dashed border-black pb-1 mb-1 text-[9px]">
          <div className="flex justify-between">
            <span>Received:</span>
            <span>₹{data.received.toFixed(2)}</span>
          </div>
          {data.balance > 0 && (
            <div className="flex justify-between font-bold">
              <span>Balance:</span>
              <span>₹{data.balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[9px] mt-2">
        <div>Thank You! Visit Again!</div>
        <div className="mt-1">🧾 Powered by Anna ERP</div>
      </div>
    </div>
  )
}

// POS 80mm Template - Thermal Receipt (300px = 80mm)
export function POS80mmTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[300px] text-[11px] font-mono bg-white p-3">
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-black pb-2 mb-2">
        <div className="font-bold text-sm">{data.companyName || 'YOUR BUSINESS'}</div>
        <div className="text-[10px] mt-1">{data.companyAddress || 'Business Address'}</div>
        <div className="text-[10px]">Phone: {data.companyPhone}</div>
        <div className="text-[10px]">GSTIN: {data.companyGstin || 'N/A'}</div>
      </div>

      {/* Invoice Info */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Invoice: <strong>{data.invoiceNumber}</strong></span>
          <span>Date: <strong>{data.invoiceDate}</strong></span>
        </div>
        <div className="mt-1">Customer: <strong>{data.customerName}</strong></div>
        {data.customerPhone && <div>Phone: {data.customerPhone}</div>}
        {data.customerGST && <div className="text-[10px]">GSTIN: {data.customerGST}</div>}
      </div>

      {/* Items Table */}
      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
          <span className="flex-1">Item</span>
          <span className="w-12 text-center">Qty</span>
          <span className="w-16 text-right">Price</span>
          <span className="w-16 text-right">Total</span>
        </div>
        {data.items.map((item: any, i: number) => (
          <div key={i} className="mb-1">
            <div className="flex justify-between">
              <span className="flex-1">{item.name}</span>
              <span className="w-12 text-center">{item.quantity}</span>
              <span className="w-16 text-right">₹{item.price.toFixed(2)}</span>
              <span className="w-16 text-right font-semibold">₹{item.total.toFixed(2)}</span>
            </div>
            {item.gst && (
              <div className="text-[10px] text-gray-600 pl-1">
                GST @ {item.gst}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{data.subtotal.toFixed(2)}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-₹{data.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax (GST):</span>
          <span>₹{data.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm mt-2 pt-1 border-t border-black">
          <span>GRAND TOTAL:</span>
          <span>₹{data.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment */}
      {data.received > 0 && (
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="flex justify-between">
            <span>Amount Received:</span>
            <span>₹{data.received.toFixed(2)}</span>
          </div>
          {data.balance > 0 && (
            <div className="flex justify-between font-bold text-red-600">
              <span>Balance Due:</span>
              <span>₹{data.balance.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-[10px] mt-2">
        <div className="font-semibold">Thank You for Your Business!</div>
        <div className="mt-1">Please Visit Again 😊</div>
        <div className="mt-2 text-[9px]">🧾 Powered by Anna ERP Silver</div>
      </div>
    </div>
  )
}

// KOT Template - Kitchen Order Ticket
export function KOTTemplate({ data, color }: { data: any; color: any }) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="w-[220px] text-[11px] font-mono bg-white p-2 border-2 border-black">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="font-bold text-lg">🍽️ KOT</div>
        <div className="text-xs">Kitchen Order Ticket</div>
      </div>

      {/* Order Info */}
      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold">
          <span>Order: #{data.invoiceNumber}</span>
          <span>{time}</span>
        </div>
        <div className="mt-1">Table/Token: <strong>{data.customerName}</strong></div>
        <div className="text-[10px] mt-1">{data.invoiceDate}</div>
      </div>

      {/* Items */}
      <div className="border-b-2 border-dashed border-black pb-2 mb-2">
        <div className="font-bold mb-2">ORDER ITEMS:</div>
        {data.items.map((item: any, i: number) => (
          <div key={i} className="mb-2 pb-1 border-b border-dashed border-gray-400">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-bold text-sm">{item.name}</div>
                {item.description && (
                  <div className="text-[10px] text-gray-600 mt-0.5">{item.description}</div>
                )}
              </div>
              <div className="font-bold text-lg ml-2">x{item.quantity}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-b-2 border-black pb-2 mb-2">
        <div className="flex justify-between font-bold">
          <span>Total Items:</span>
          <span>{data.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] mt-2">
        <div className="font-bold">*** PREPARE IMMEDIATELY ***</div>
        <div className="mt-1">Printed: {now.toLocaleString('en-IN')}</div>
      </div>
    </div>
  )
}
