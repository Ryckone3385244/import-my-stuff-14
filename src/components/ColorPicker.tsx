import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { hslToHex, hexToHsl } from "@/lib/colorUtils";

interface ColorPickerProps {
  label: string;
  value: string; // HSL format "h s% l%"
  onChange: (hslValue: string) => void;
  id: string;
}

// Validate hex color (3 or 6 hex chars)
const isValidHex = (hex: string): boolean => {
  const cleanHex = hex.trim().replace(/^#/, '');
  return /^[a-f\d]{3}$/i.test(cleanHex) || /^[a-f\d]{6}$/i.test(cleanHex);
};

export const ColorPicker = ({ label, value, onChange, id }: ColorPickerProps) => {
  // Local state for text input - allows intermediate/partial values
  const [localHex, setLocalHex] = useState("");
  const lastValidHex = useRef("");

  // Sync from parent HSL → local hex when value prop changes
  useEffect(() => {
    try {
      const hex = hslToHex(value);
      setLocalHex(hex);
      lastValidHex.current = hex;
    } catch (e) {
      console.error("Error converting HSL to hex:", e);
    }
  }, [value]);

  // Handle text input changes - update local state immediately,
  // only propagate to parent when valid
  const handleTextChange = (newHex: string) => {
    setLocalHex(newHex);
    
    // Only call onChange when hex is valid
    if (isValidHex(newHex)) {
      try {
        const hsl = hexToHsl(newHex);
        lastValidHex.current = newHex.startsWith('#') ? newHex : `#${newHex}`;
        onChange(hsl);
      } catch (e) {
        console.error("Invalid hex color:", e);
      }
    }
  };

  // On blur, reset to last valid value if current is invalid
  const handleBlur = () => {
    if (!isValidHex(localHex)) {
      setLocalHex(lastValidHex.current);
    } else {
      // Normalize to # prefix
      const normalized = localHex.startsWith('#') ? localHex : `#${localHex}`;
      setLocalHex(normalized);
      lastValidHex.current = normalized;
    }
  };

  // Native color picker always provides valid values
  const handleNativeColorChange = (newHex: string) => {
    setLocalHex(newHex);
    lastValidHex.current = newHex;
    try {
      const hsl = hexToHsl(newHex);
      onChange(hsl);
    } catch (e) {
      console.error("Invalid hex color from picker:", e);
    }
  };

  // Get valid hex for native picker (fallback to black if invalid)
  const nativePickerValue = isValidHex(localHex) 
    ? (localHex.startsWith('#') ? localHex : `#${localHex}`)
    : '#000000';

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-black">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={nativePickerValue}
          onChange={(e) => handleNativeColorChange(e.target.value)}
          className="w-16 h-10 p-1 cursor-pointer"
        />
        <Input
          type="text"
          value={localHex}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="#1a9f5f"
          className="bg-white text-gray-700 flex-1"
        />
      </div>
    </div>
  );
};
