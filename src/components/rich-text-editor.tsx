'use client';

import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Editor Chapter — pola di-port dari
 * `app/auction-market/bagdja-auction-web/components/rich-text-editor.tsx`
 * (versi shadcn/Tailwind, bukan HeroUI seperti `bagdja-website-admin`).
 * Toolbar sengaja minimal (bold/italic/underline, heading, list, undo/redo)
 * — Chapter novel itu prosa panjang, bukan editor toko yang butuh gambar/
 * tabel/link (lihat plan/bookpedia/overview.md §8.1).
 */
const EDITOR_CONTENT_CLASS =
  'min-h-[60vh] px-4 py-4 sm:px-8 sm:py-6 text-base leading-loose text-foreground outline-none ' +
  '[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left ' +
  '[&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground ' +
  '[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] ' +
  '[&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold ' +
  '[&_li]:ml-4 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc';

function countWords(text: string): number {
  const normalized = text.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function ToolbarSeparator() {
  return <span className="mx-0.5 w-px self-stretch bg-border" />;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'min-w-[2rem] rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-background hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarButtons({ editor, disabled }: { editor: Editor; disabled: boolean }) {
  return (
    <>
      <ToolbarButton title="Bold" disabled={disabled} active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton title="Italic" disabled={disabled} active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton title="Underline" disabled={disabled} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        U
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" disabled={disabled} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        S
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title="Heading 1"
        disabled={disabled}
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        disabled={disabled}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        disabled={disabled}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton
        title="Bullet list"
        disabled={disabled}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        disabled={disabled}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>

      <ToolbarButton
        title="Quote"
        disabled={disabled}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        “ ”
      </ToolbarButton>
      <ToolbarButton
        title="Code"
        disabled={disabled}
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {'</>'}
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton title="Horizontal rule" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        ―
      </ToolbarButton>
      <ToolbarButton title="Clear formatting" disabled={disabled} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
        Tx
      </ToolbarButton>

      <ToolbarSeparator />

      <ToolbarButton title="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()}>
        ↷
      </ToolbarButton>
    </>
  );
}

export function RichTextEditor({ value, onChange, disabled = false, placeholder, className }: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState(() => countWords(value));
  const [characterCount, setCharacterCount] = useState(() => value.replace(/<[^>]*>/g, '').length);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? 'Mulai menulis chapter di sini…' }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: updated }) => {
      const text = updated.getText();
      setWordCount(countWords(text));
      setCharacterCount(text.length);
      onChange(updated.getHTML());
    },
    editorProps: {
      attributes: { class: EDITOR_CONTENT_CLASS },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  // Sync balik value->editor (mis. saat pindah chapter lain lewat sidebar)
  // TANPA emit onUpdate lagi, supaya tidak muter (loop) dgn onChange di atas.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    const text = editor.getText();
    setWordCount(countWords(text));
    setCharacterCount(text.length);
  }, [value, editor]);

  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border bg-card', className)}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
        {editor && <ToolbarButtons editor={editor} disabled={disabled} />}
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{wordCount.toLocaleString('id-ID')} kata</span>
        <span>{characterCount.toLocaleString('id-ID')} karakter</span>
      </div>
    </div>
  );
}
