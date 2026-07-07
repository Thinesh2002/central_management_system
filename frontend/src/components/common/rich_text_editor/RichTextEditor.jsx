import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Link2Off,
  ImagePlus,
  Table as TableIcon,
  Columns,
  Rows,
  Trash2,
  Undo2,
  Redo2,
  Heading2,
  Heading3,
  Loader2,
} from "lucide-react";

// Tailwind classes applied to a freshly inserted image, and to each
// alignment state. These exact literal strings must stay in this file
// (not built dynamically from fragments) so Tailwind's JIT scanner picks
// them up -- dynamically-concatenated class names are invisible to it.
const IMAGE_BASE_CLASS = "max-w-full h-auto rounded-lg my-2 block";
const IMAGE_ALIGN_CLASS = {
  none: "max-w-full h-auto rounded-lg my-2 block",
  left: "max-w-full h-auto rounded-lg my-2 float-left mr-4",
  center: "max-w-full h-auto rounded-lg my-2 mx-auto block",
  right: "max-w-full h-auto rounded-lg my-2 float-right ml-4",
};

// Image extension extended with an alignment-aware class attribute so
// "align image left/center/right" actually works (TextAlign only affects
// text nodes, not images).
const AlignableImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: IMAGE_BASE_CLASS,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => ({
          class: attributes.class || IMAGE_BASE_CLASS,
        }),
      },
    };
  },
});

function ToolbarButton({ onClick, active, disabled, title, children, wide }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-8 shrink-0 items-center justify-center rounded-lg border text-slate-300 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        wide ? "w-auto gap-1 px-2 text-[11px] font-bold" : "w-8"
      } ${
        active
          ? "border-orange-400 bg-orange-400/10 text-orange-300"
          : "border-transparent hover:border-slate-700 hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-slate-700" />;
}

/**
 * Rich text (WYSIWYG) editor for product descriptions.
 *
 * Props:
 *  - value: HTML string
 *  - onChange(html): called on every edit
 *  - placeholder: string
 *  - minHeight: css min-height for the editable area
 *  - onUploadImage: optional async (file) => url. If provided, an
 *    "Upload image" button is shown alongside "Insert image by URL".
 *    (Not available on Add Product pages until the product exists.)
 */
export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  minHeight = 160,
  onUploadImage = null,
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        link: false,
        heading: {
          levels: [2, 3],
          HTMLAttributes: { class: "mt-4 mb-2 font-extrabold text-white" },
        },
        paragraph: {
          HTMLAttributes: { class: "mb-3 last:mb-0" },
        },
        bulletList: {
          HTMLAttributes: { class: "mb-3 ml-5 list-disc space-y-1" },
        },
        orderedList: {
          HTMLAttributes: { class: "mb-3 ml-5 list-decimal space-y-1" },
        },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-orange-400 underline underline-offset-2 hover:text-orange-300",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      AlignableImage.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "w-full border-collapse my-3" },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-slate-700 bg-slate-800 px-2 py-1.5 text-left font-bold text-white",
        },
      }),
      TableCell.configure({
        HTMLAttributes: { class: "border border-slate-700 px-2 py-1.5 align-top" },
      }),
    ],
    content: value || "",
    onUpdate: ({ editor: currentEditor }) => {
      onChange?.(currentEditor.getHTML());
    },
  });

  // Keep editor content in sync if `value` is replaced from outside
  // (e.g. loading an existing product), without fighting the user's typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined && value !== null) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  function setImageAlign(align) {
    editor.chain().focus().updateAttributes("image", { class: IMAGE_ALIGN_CLASS[align] }).run();
  }

  function handleInsertImageByUrl() {
    const url = window.prompt("Image URL:");
    if (!url) return;
    editor.chain().focus().setImage({ src: url, class: IMAGE_BASE_CLASS }).run();
  }

  function handleUploadClick() {
    if (!onUploadImage) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setUploading(true);
        const url = await onUploadImage(file);
        if (url) {
          editor.chain().focus().setImage({ src: url, class: IMAGE_BASE_CLASS }).run();
        }
      } catch (error) {
        window.alert(
          error?.friendlyMessage ||
            error?.response?.data?.message ||
            "Image upload failed."
        );
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  function handleSetLink() {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Link URL:", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function insertTable() {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  const showPlaceholder = editor.isEmpty;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220]">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-800 bg-[#0d1526] px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Add / edit link" active={editor.isActive("link")} onClick={handleSetLink}>
          <Link2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!editor.isActive("link")}
        >
          <Link2Off size={15} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Insert image by URL" onClick={handleInsertImageByUrl}>
          <ImagePlus size={15} />
        </ToolbarButton>

        {onUploadImage && (
          <ToolbarButton title="Upload image" onClick={handleUploadClick} disabled={uploading}>
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </ToolbarButton>
        )}

        {editor.isActive("image") && (
          <>
            <ToolbarButton title="Align image left" onClick={() => setImageAlign("left")}>
              <AlignLeft size={14} />
            </ToolbarButton>
            <ToolbarButton title="Align image center" onClick={() => setImageAlign("center")}>
              <AlignCenter size={14} />
            </ToolbarButton>
            <ToolbarButton title="Align image right" onClick={() => setImageAlign("right")}>
              <AlignRight size={14} />
            </ToolbarButton>
          </>
        )}

        <Divider />

        <ToolbarButton title="Insert table" onClick={insertTable} wide>
          <TableIcon size={14} />
          Table
        </ToolbarButton>
        <ToolbarButton
          title="Add column"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.isActive("table")}
          wide
        >
          <Columns size={14} />
          Col
        </ToolbarButton>
        <ToolbarButton
          title="Add row"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.isActive("table")}
          wide
        >
          <Rows size={14} />
          Row
        </ToolbarButton>
        <ToolbarButton
          title="Delete table"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.isActive("table")}
        >
          <Trash2 size={14} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </ToolbarButton>
      </div>

      <div className="relative overflow-x-auto px-3 py-2.5" style={{ minHeight }}>
        {showPlaceholder && (
          <span className="pointer-events-none absolute left-3 top-2.5 select-none text-sm text-slate-500">
            {placeholder}
          </span>
        )}

        <EditorContent
          editor={editor}
          className="max-w-none text-sm leading-6 text-slate-200 [&_.ProseMirror]:outline-none"
        />
      </div>
    </div>
  );
}

/**
 * Drop-in replacement for TextareaField({ label, value, onChange, placeholder })
 * used across the product add/edit forms -- same props, HTML output instead
 * of plain text.
 */
export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  onUploadImage,
  minHeight,
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wide text-slate-300">
          {label} {required && <span className="text-orange-300">*</span>}
        </span>
        {hint && <span className="text-[11px] font-medium text-slate-500">{hint}</span>}
      </div>

      <RichTextEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onUploadImage={onUploadImage}
        minHeight={minHeight}
      />
    </label>
  );
}
