import { Select } from "@/components/ui/select";

interface StyledSelectProps {
  children: React.ReactNode;
  [key: string]: any;
}

export function StyledSelect({ children, ...props }: StyledSelectProps) {
  return (
    <Select {...props}>
      {children}
    </Select>
  );
}