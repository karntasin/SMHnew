import * as React from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string | number;
  label: string;
}

interface MultiSelectProps {
  id?: string;
  options: MultiSelectOption[];
  value: Array<string | number>;
  onChange: (values: Array<string | number>) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ 
  id, 
  options, 
  value, 
  onChange, 
  placeholder = 'เลือกตำแหน่งงาน...',
  className 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (optValue: string | number) => {
    const stringValue = String(optValue);
    const currentValues = value.map(String);
    
    if (currentValues.includes(stringValue)) {
      onChange(value.filter(v => String(v) !== stringValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeOption = (optValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => String(v) !== String(optValue)));
  };

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabels = value.map(v => {
    const opt = options.find(o => String(o.value) === String(v));
    return opt ? { value: v, label: opt.label } : null;
  }).filter(Boolean) as { value: string | number; label: string }[];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Selected items display */}
      <div
        id={id}
        className="min-h-[42px] border rounded-md px-3 py-2 cursor-pointer bg-white hover:border-indigo-400 transition-colors flex items-center justify-between gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedLabels.map(item => (
              <span
                key={item.value}
                className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-md"
              >
                {item.label.length > 20 ? item.label.substring(0, 20) + '...' : item.label}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-600"
                  onClick={(e) => removeOption(item.value, e)}
                />
              </span>
            ))
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="ค้นหา..."
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">ไม่พบข้อมูล</div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = value.map(String).includes(String(opt.value));
                return (
                  <div
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors",
                      isSelected && "bg-indigo-50"
                    )}
                    onClick={() => toggleOption(opt.value)}
                  >
                    <div className={cn(
                      "w-4 h-4 border rounded flex items-center justify-center",
                      isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm">{opt.label}</span>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Selected count */}
          {value.length > 0 && (
            <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
              เลือกแล้ว {value.length} รายการ
            </div>
          )}
        </div>
      )}
    </div>
  );
};
