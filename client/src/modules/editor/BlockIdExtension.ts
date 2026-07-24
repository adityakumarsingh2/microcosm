import { Extension } from "@tiptap/react";

export const BlockIdExtension = Extension.create({
  name: "blockId",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph", "blockquote", "codeBlock", "image", "taskItem"],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { "data-block-id": attributes.blockId };
            },
          },
        },
      },
    ];
  },
});
