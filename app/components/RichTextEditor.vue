<template>
  <div class="rich-text-editor" :class="{ 'focused': isFocused }">
    <!-- Toolbar -->
    <div v-if="editor && toolbar !== 'none'" class="editor-toolbar">
      <template v-if="toolbar === 'full'">
        <div class="toolbar-group">
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('bold') }"
            title="Negrito (Ctrl+B)"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <UIcon name="i-lucide-bold" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('italic') }"
            title="Itálico (Ctrl+I)"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <UIcon name="i-lucide-italic" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('underline') }"
            title="Sublinhado (Ctrl+U)"
            @click="editor.chain().focus().toggleUnderline().run()"
          >
            <UIcon name="i-lucide-underline" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('strike') }"
            title="Riscado"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <UIcon name="i-lucide-strikethrough" class="size-4" />
          </button>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-group">
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('bulletList') }"
            title="Lista com marcadores"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            <UIcon name="i-lucide-list" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('orderedList') }"
            title="Lista numerada"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            <UIcon name="i-lucide-list-ordered" class="size-4" />
          </button>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-group">
          <button
            type="button"
            class="toolbar-btn"
            title="Inserir link"
            :class="{ 'is-active': editor.isActive('link') }"
            @click="setLink"
          >
            <UIcon name="i-lucide-link" class="size-4" />
          </button>
          <button
            v-if="enableImages"
            type="button"
            class="toolbar-btn"
            title="Inserir imagem"
            @click="triggerImageUpload"
          >
            <UIcon name="i-lucide-image" class="size-4" />
          </button>
        </div>
      </template>

      <template v-else-if="toolbar === 'minimal'">
        <div class="toolbar-group">
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('bold') }"
            title="Negrito"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <UIcon name="i-lucide-bold" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('italic') }"
            title="Itálico"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <UIcon name="i-lucide-italic" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            :class="{ 'is-active': editor.isActive('bulletList') }"
            title="Lista"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            <UIcon name="i-lucide-list" class="size-4" />
          </button>
          <button
            type="button"
            class="toolbar-btn"
            title="Link"
            :class="{ 'is-active': editor.isActive('link') }"
            @click="setLink"
          >
            <UIcon name="i-lucide-link" class="size-4" />
          </button>
        </div>
      </template>
    </div>

    <!-- Hidden file input -->
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageUpload"
    />

    <!-- Editor content -->
    <EditorContent :editor="editor" class="editor-content" :style="{ minHeight: height }" />

    <!-- Mention menu -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95"
        enter-to-class="transform opacity-100 scale-100"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100"
        leave-to-class="transform opacity-0 scale-95"
      >
        <div
          v-if="showMentionMenu && filteredMembers.length > 0"
          class="mention-menu"
          :style="mentionMenuStyle"
        >
          <div class="mention-menu-header">Mencionar membro</div>
          <div class="mention-menu-items">
            <button
              v-for="(member, index) in filteredMembers"
              :key="member.id"
              type="button"
              class="mention-menu-item"
              :class="{ 'is-selected': index === selectedMentionIndex }"
              @click="insertMention(member)"
              @mouseenter="selectedMentionIndex = index"
            >
              <UAvatar :alt="member.name" :src="member.avatar" size="xs" />
              <div class="mention-menu-item-content">
                <div class="mention-menu-item-name">{{ member.name }}</div>
              </div>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Mention from '@tiptap/extension-mention'

interface MentionMember {
  id: number
  uuid?: string
  name: string
  avatar?: string
}

const props = withDefaults(defineProps<{
  placeholder?: string
  toolbar?: 'full' | 'minimal' | 'none'
  height?: string
  enableImages?: boolean
  enableMentions?: boolean
  members?: MentionMember[]
}>(), {
  placeholder: 'Digite aqui...',
  toolbar: 'full',
  height: '150px',
  enableImages: true,
  enableMentions: false,
  members: () => []
})

const emit = defineEmits<{
  mention: [member: MentionMember]
}>()

const modelValue = defineModel<string>({ default: '' })

const isFocused = ref(false)
const imageInput = ref<HTMLInputElement | null>(null)

// Mention state
const showMentionMenu = ref(false)
const mentionMenuPosition = ref({ top: 0, left: 0 })
const selectedMentionIndex = ref(0)
const mentionQuery = ref('')

const filteredMembers = computed(() => {
  if (!mentionQuery.value) return props.members.slice(0, 10)
  return props.members
    .filter(member => member.name.toLowerCase().includes(mentionQuery.value.toLowerCase()))
    .slice(0, 10)
})

const mentionMenuStyle = computed(() => ({
  position: 'fixed' as const,
  top: `${mentionMenuPosition.value.top}px`,
  left: `${mentionMenuPosition.value.left}px`,
  zIndex: 99999
}))

// Normalize HTML content to ensure compatibility with TipTap
const normalizeHtml = (html: string): string => {
  if (!html) return ''
  
  // Create a temporary element to parse the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html
  
  // Ensure images are properly formatted
  const images = tempDiv.querySelectorAll('img')
  images.forEach(img => {
    // Make sure src attribute is preserved
    const src = img.getAttribute('src')
    if (src) {
      img.setAttribute('src', src)
    }
  })
  
  return tempDiv.innerHTML
}

// Get normalized initial content
const getInitialContent = () => {
  const content = modelValue.value || ''
  return normalizeHtml(content)
}

const editor = useEditor({
  content: getInitialContent(),
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
    },
    handlePaste: (view, event) => {
      if (!props.enableImages) return false
      
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              editor.value?.chain().focus().setImage({ src: result }).run()
            }
            reader.readAsDataURL(file)
          }
          return true
        }
      }
      return false
    },
    handleDrop: (view, event) => {
      if (!props.enableImages) return false
      
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return false

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            editor.value?.chain().focus().setImage({ src: result }).run()
          }
          reader.readAsDataURL(file)
          return true
        }
      }
      return false
    },
    handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
      // Handle mention menu navigation
      if (showMentionMenu.value) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          selectedMentionIndex.value = (selectedMentionIndex.value + 1) % filteredMembers.value.length
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          selectedMentionIndex.value = (selectedMentionIndex.value - 1 + filteredMembers.value.length) % filteredMembers.value.length
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const member = filteredMembers.value[selectedMentionIndex.value]
          if (member) insertMention(member)
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          closeMentionMenu()
          return true
        }
      }
      return false
    },
  },
  extensions: [
    StarterKit,
    Image.configure({
      inline: true,
      allowBase64: true,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'editor-link',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
    Underline,
    Mention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      renderHTML({ node }) {
        return [
          'span',
          {
            class: 'mention',
            'data-type': 'mention',
            'data-id': node.attrs.id,
            'data-label': node.attrs.label,
          },
          `@${node.attrs.label ?? node.attrs.id}`,
        ]
      },
      suggestion: {
        char: '@',
        startOfLine: false,
        items: ({ query }: { query: string }) => {
          return props.members
            .filter(member => member.name.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10)
        },
      },
    }),
  ],
  onUpdate: ({ editor }) => {
    isInternalUpdate.value = true
    modelValue.value = editor.getHTML()
    nextTick(() => {
      isInternalUpdate.value = false
    })

    if (!props.enableMentions) return

    const { state } = editor
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n')

    // Check for mention trigger (@)
    const mentionMatch = textBefore.match(/@([^\s@]*)$/)
    if (mentionMatch) {
      mentionQuery.value = mentionMatch[1] || ''
      selectedMentionIndex.value = 0

      const coords = editor.view.coordsAtPos(from)

      mentionMenuPosition.value = {
        top: coords.bottom + 5,
        left: coords.left
      }

      showMentionMenu.value = true
    } else {
      showMentionMenu.value = false
    }
  },
  onFocus: () => {
    isFocused.value = true
  },
  onBlur: () => {
    isFocused.value = false
    // Delay closing menu to allow click
    setTimeout(() => {
      if (!isFocused.value) {
        showMentionMenu.value = false
      }
    }, 200)
  },
  onCreate: ({ editor }) => {
    // Ensure content is loaded after editor is fully initialized
    if (modelValue.value) {
      const normalizedContent = normalizeHtml(modelValue.value)
      const currentContent = editor.getHTML()
      if (currentContent !== normalizedContent && (currentContent === '<p></p>' || !currentContent.includes('<img'))) {
        editor.commands.setContent(normalizedContent, { emitUpdate: false })
      }
    }
  },
})

// Mention functions
const insertMention = (member: MentionMember) => {
  if (!editor.value) return

  const { state } = editor.value
  const { from } = state.selection
  const textBefore = state.doc.textBetween(Math.max(0, from - 50), from, '\n')
  const mentionMatch = textBefore.match(/@([^\s@]*)$/)

  if (mentionMatch) {
    const deleteFrom = from - mentionMatch[0].length
    editor.value
      .chain()
      .focus()
      .deleteRange({ from: deleteFrom, to: from })
      .insertContent({
        type: 'mention',
        attrs: {
          id: member.id,
          label: member.name,
        },
      })
      .insertContent(' ')
      .run()
  }

  emit('mention', member)
  closeMentionMenu()
}

const closeMentionMenu = () => {
  showMentionMenu.value = false
  mentionQuery.value = ''
  selectedMentionIndex.value = 0
}

const setLink = () => {
  if (!editor.value) return

  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('URL do link:', previousUrl)

  if (url === null) return

  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }

  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const triggerImageUpload = () => {
  imageInput.value?.click()
}

const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file || !editor.value) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    editor.value?.chain().focus().setImage({ src: result }).run()
  }
  reader.readAsDataURL(file)

  input.value = ''
}

// Watch for external changes
const isInternalUpdate = ref(false)

// Sync content when editor is ready or modelValue changes
watch(() => modelValue.value, (newValue) => {
  if (!editor.value || isInternalUpdate.value) return
  
  const currentContent = editor.value.getHTML()
  const normalizedNew = normalizeHtml(newValue || '').trim()
  const normalizedCurrent = currentContent.trim()
  
  // Check if new value has real content (like images) that current doesn't have
  const newHasImages = normalizedNew.includes('<img')
  const currentHasImages = normalizedCurrent.includes('<img')
  
  // Force update if new content has images but current doesn't
  if (newHasImages && !currentHasImages) {
    editor.value.commands.setContent(normalizedNew, { emitUpdate: false })
    return
  }
  
  // Avoid updating if content is effectively the same or empty
  if (normalizedNew !== normalizedCurrent && normalizedNew !== '<p></p>' && normalizedNew !== '') {
    editor.value.commands.setContent(normalizedNew, { emitUpdate: false })
  }
}, { immediate: true })

// Also watch for editor creation to ensure initial content is set
watch(() => editor.value, (editorInstance) => {
  if (editorInstance && modelValue.value) {
    const currentContent = editorInstance.getHTML()
    if (currentContent === '<p></p>' || currentContent === '') {
      const normalizedContent = normalizeHtml(modelValue.value)
      editorInstance.commands.setContent(normalizedContent, { emitUpdate: false })
    }
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.rich-text-editor {
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  overflow: hidden;
  background: white;
  transition: all 0.2s;
}

:global(.dark) .rich-text-editor {
  border-color: rgb(55 65 81);
  background: rgb(17 24 39);
}

.rich-text-editor.focused {
  border-color: rgb(99 102 241);
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border-bottom: 1px solid rgb(229 231 235);
  background: rgb(249 250 251);
  flex-wrap: wrap;
}

:global(.dark) .editor-toolbar {
  border-color: rgb(55 65 81);
  background: rgb(31 41 55);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.125rem;
}

.toolbar-divider {
  width: 1px;
  height: 1.5rem;
  background: rgb(209 213 219);
  margin: 0 0.25rem;
}

:global(.dark) .toolbar-divider {
  background: rgb(75 85 99);
}

.toolbar-btn {
  padding: 0.375rem;
  border-radius: 0.25rem;
  color: rgb(75 85 99);
  transition: all 0.15s;
  background: transparent;
  border: none;
  cursor: pointer;
}

.toolbar-btn:hover {
  background: rgb(229 231 235);
}

:global(.dark) .toolbar-btn {
  color: rgb(156 163 175);
}

:global(.dark) .toolbar-btn:hover {
  background: rgb(55 65 81);
}

.toolbar-btn.is-active {
  background: rgb(219 234 254);
  color: rgb(37 99 235);
}

:global(.dark) .toolbar-btn.is-active {
  background: rgb(30 58 95);
  color: rgb(96 165 250);
}

.editor-content {
  padding: 1rem;
}

.editor-content :deep(.ProseMirror) {
  outline: none;
  min-height: v-bind(height);
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: rgb(156 163 175);
  float: left;
  height: 0;
  pointer-events: none;
  content: attr(data-placeholder);
}

:global(.dark) .editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: rgb(107 114 128);
}

.editor-content :deep(.ProseMirror p) {
  margin-bottom: 0.5rem;
}

.editor-content :deep(.ProseMirror ul),
.editor-content :deep(.ProseMirror ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.5rem;
}

.editor-content :deep(.ProseMirror ul) {
  list-style-type: disc;
}

.editor-content :deep(.ProseMirror ol) {
  list-style-type: decimal;
}

.editor-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
}

.editor-content :deep(.ProseMirror a) {
  color: rgb(79 70 229);
  text-decoration: underline;
}

:global(.dark) .editor-content :deep(.ProseMirror a) {
  color: rgb(129 140 248);
}

/* Mention styling in editor */
.editor-content :deep(.mention) {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

:global(.dark) .editor-content :deep(.mention) {
  background: rgb(30 58 95);
  color: rgb(96 165 250);
}

/* Mention menu */
.mention-menu {
  background: white;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  overflow: hidden;
  min-width: 220px;
  max-height: 280px;
  overflow-y: auto;
}

:global(.dark) .mention-menu {
  background: rgb(31 41 55);
  border-color: rgb(55 65 81);
}

.mention-menu-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(107 114 128);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgb(249 250 251);
  border-bottom: 1px solid rgb(229 231 235);
}

:global(.dark) .mention-menu-header {
  color: rgb(156 163 175);
  background: rgb(17 24 39);
  border-color: rgb(55 65 81);
}

.mention-menu-items {
  padding: 0.25rem 0;
}

.mention-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  transition: background 0.15s;
  background: transparent;
  border: none;
  cursor: pointer;
}

.mention-menu-item:hover,
.mention-menu-item.is-selected {
  background: rgb(243 244 246);
}

:global(.dark) .mention-menu-item:hover,
:global(.dark) .mention-menu-item.is-selected {
  background: rgb(55 65 81);
}

.mention-menu-item-content {
  flex: 1;
  min-width: 0;
}

.mention-menu-item-name {
  font-weight: 500;
  color: rgb(17 24 39);
  font-size: 0.875rem;
}

:global(.dark) .mention-menu-item-name {
  color: white;
}
</style>
