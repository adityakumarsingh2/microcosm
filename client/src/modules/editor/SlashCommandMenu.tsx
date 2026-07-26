import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Heading1, Heading2, List, CheckSquare, Quote, Image as ImageIcon } from "lucide-react";

export const SlashCommandMenu = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
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

  if (props.items.length === 0) {
    return null;
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Heading1": return <Heading1 size={14} />;
      case "Heading2": return <Heading2 size={14} />;
      case "List": return <List size={14} />;
      case "CheckSquare": return <CheckSquare size={14} />;
      case "Quote": return <Quote size={14} />;
      case "Image": return <ImageIcon size={14} />;
      default: return null;
    }
  };

  return (
    <div className="slash-menu">
      {props.items.map((item: any, index: number) => (
        <button
          className={`slash-menu-item ${index === selectedIndex ? "is-selected" : ""}`}
          key={index}
          onClick={() => selectItem(index)}
        >
          <div className="slash-menu-icon">{getIcon(item.icon)}</div>
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
});
