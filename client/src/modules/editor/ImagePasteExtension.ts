import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { uploadImageFile } from "../uploads/uploads.api";

export const ImagePasteExtension = Extension.create({
  name: "imagePaste",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("imagePasteHandler"),
        props: {
          handlePaste(view, event) {
            const items = Array.from(event.clipboardData?.items || []);
            const imageItems = items.filter(
              (item) => item.kind === "file" && item.type.indexOf("image") === 0
            );

            // If there are no image files, let standard paste handle it
            if (imageItems.length === 0) {
              return false;
            }

            event.preventDefault();

            imageItems.forEach((item) => {
              const file = item.getAsFile();
              if (file) {
                uploadImageFile(file)
                  .then((asset) => {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: asset.url, alt: file.name });
                    const tr = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(tr);
                  })
                  .catch((err) => {
                    console.error("Failed to upload pasted image:", err);
                    const reader = new FileReader();
                    reader.onload = (readerEvent) => {
                      const base64 = readerEvent.target?.result as string;
                      const { schema } = view.state;
                      const node = schema.nodes.image.create({ src: base64 });
                      const tr = view.state.tr.replaceSelectionWith(node);
                      view.dispatch(tr);
                    };
                    reader.readAsDataURL(file);
                  });
              }
            });

            return true;
          },
        },
      }),
    ];
  },
});
