import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import CharacterCount from '@tiptap/extension-character-count';

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";

import {
  Bold, Italic, Heading, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Image as ImageIcon,
  Link as LinkIcon, Table as TableIcon, Undo, Redo, Copy, Code, Sparkles
} from "lucide-react";

const RichTextEditor = ({ initialValue = "", onChange }) => {
  const [isHtmlView, setIsHtmlView] = useState(false);
  const [htmlValue, setHtmlValue] = useState(initialValue);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Image.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount.configure({
        limit: 10000,
      }),
    ],
    content: initialValue,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] cursor-text'
      }
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setHtmlValue(html);
      onChange(html);
    },
  });

  useEffect(() => {
    if (editor && initialValue && initialValue !== editor.getHTML()) {
      editor.commands.setContent(initialValue, false);
      setHtmlValue(initialValue);
    }
  }, [initialValue, editor]);

  if (!editor) return null;

  const toggleHtmlView = () => {
    if (isHtmlView) {
      editor.commands.setContent(htmlValue, false);
    }
    setIsHtmlView(!isHtmlView);
  };

  const addLink = () => {
    const url = prompt("Enter URL");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const copyContent = async () => {
    await navigator.clipboard.writeText(htmlValue);
    alert("Matrix HTML Copied to Clipboard");
  };

  return (
    <div className="rounded-[2rem] border border-white/5 bg-[#0b1224] overflow-hidden shadow-2xl transition-all hover:border-blue-500/20">

      {/* ===== TOOLBAR ===== */}
      <div
        className="flex flex-wrap items-center gap-1 p-3 border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-10"
        onMouseDown={(e) => e.preventDefault()}
      >
        {!isHtmlView && (
          <>
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mr-1">
              <Btn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></Btn>
              <Btn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></Btn>
              <Btn active={editor.isActive('heading')} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading size={16} /></Btn>
            </div>

            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mr-1">
              <Btn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} /></Btn>
              <Btn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
            </div>

            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mr-1">
              <Btn active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
              <Btn active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
              <Btn active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
            </div>

            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mr-1">
              <Btn onClick={addLink}><LinkIcon size={16} /></Btn>
              <Btn onClick={() => {
                const url = prompt("Image URL");
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}><ImageIcon size={16} /></Btn>
              <Btn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon size={16} /></Btn>
            </div>

            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <Btn onClick={() => editor.chain().focus().undo().run()}><Undo size={16} /></Btn>
              <Btn onClick={() => editor.chain().focus().redo().run()}><Redo size={16} /></Btn>
            </div>
          </>
        )}

        <div className="ml-auto flex gap-2">
           <button 
             onClick={toggleHtmlView}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
             ${isHtmlView ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
           >
             <Code size={14} /> {isHtmlView ? "Visual Node" : "HTML Source"}
           </button>
           <Btn onClick={copyContent}>
             <Copy size={16} />
           </Btn>
        </div>
      </div>

      {/* ===== EDITOR / HTML VIEW ===== */}
      <div className="relative">
        {isHtmlView ? (
          <textarea
            value={htmlValue}
            onChange={(e) => {
              setHtmlValue(e.target.value);
              onChange(e.target.value);
            }}
            className="w-full min-h-[400px] p-6 bg-[#020617] text-blue-400 font-mono text-xs leading-relaxed outline-none scrollbar-hide"
            spellCheck="false"
          />
        ) : (
          <div className="bg-[#020617]/40 p-2">
             <EditorContent
               editor={editor}
               className="p-6 text-slate-300 min-h-[400px] scrollbar-hide"
             />
          </div>
        )}
        
        {/* Subtle Bottom Bar */}
        <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <Sparkles size={10} className="text-blue-500" /> Auto-Format Active
           </div>
           <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              {editor.storage.characterCount.characters()} Characters Indexed
           </div>
        </div>
      </div>
    </div>
  );
};

/* ===== UI Helpers ===== */

const Btn = ({ children, onClick, active }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-2 rounded-lg transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
  >
    {children}
  </button>
);

export default RichTextEditor;