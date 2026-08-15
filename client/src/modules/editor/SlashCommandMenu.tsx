import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Heading1, Heading2, List, CheckSquare, Quote, Image as ImageIcon, Code } from "lucide-react";

export const SlashCommandMenu = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => { setSelectedIndex(0); }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) props.command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (props.items.length === 0) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Heading1":    return <Heading1 size={13} />;
      case "Heading2":    return <Heading2 size={13} />;
      case "List":        return <List size={13} />;
      case "CheckSquare": return <CheckSquare size={13} />;
      case "Quote":       return <Quote size={13} />;
      case "Image":       return <ImageIcon size={13} />;
      case "Code":        return <Code size={13} />;
      default:            return null;
    }
  };

  return (
    <div
      className="flex flex-col gap-0.5 p-1.5 w-52
                 bg-card border-2 border-foreground
                 font-mono text-xs text-foreground"
      style={{ boxShadow: "4px 4px 0px 0px rgba(255,255,255,0.15)" }}
    >
      <p className="px-2 py-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-foreground/10 mb-1">
        Insert block
      </p>
      {props.items.map((item: any, index: number) => (
        <button
          key={index}
          onClick={() => selectItem(index)}
          className={`flex items-center gap-2.5 px-2.5 py-2 text-left transition-all duration-100
                      ${index === selectedIndex
                        ? "bg-foreground text-background"
                        : "hover:bg-secondary text-foreground/80 hover:text-foreground"
                      }`}
        >
          <span className={`flex-shrink-0 ${index === selectedIndex ? "text-background" : "text-blue-400"}`}>
            {getIcon(item.icon)}
          </span>
          <span className="font-semibold">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
