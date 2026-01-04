<script setup lang="ts">
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
  height: '200px',
  enableImages: true,
  enableMentions: false,
  members: () => []
})

const emit = defineEmits<{
  mention: [member: MentionMember]
}>()

const modelValue = defineModel<string>({ default: '' })

// Ref local para o conteúdo do editor
const internalContent = ref(modelValue.value || '')
const quillEditor = ref<any>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const editorContainer = ref<HTMLElement | null>(null)

// Mention state
const showMentionPopover = ref(false)
const mentionQuery = ref('')
const mentionPosition = ref({ top: 0, left: 0 })
const mentionStartIndex = ref<number | null>(null)
const selectedMentionIndex = ref(0)

// Filtered members based on query
const filteredMembers = computed(() => {
  if (!mentionQuery.value) return props.members.slice(0, 10)
  const query = mentionQuery.value.toLowerCase()
  return props.members
    .filter(m => m.name.toLowerCase().includes(query))
    .slice(0, 10)
})

// Sincronizar quando modelValue muda externamente
watch(modelValue, (newVal) => {
  if (newVal !== internalContent.value) {
    internalContent.value = newVal || ''
  }
})

// Configuração da toolbar
const toolbarOptions = computed(() => {
  if (props.toolbar === 'none') return false
  
  if (props.toolbar === 'minimal') {
    return [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ...(props.enableImages ? [['image']] : []),
      ['clean']
    ]
  }

  // Full toolbar
  return [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', ...(props.enableImages ? ['image'] : []), 'code-block'],
    ['clean']
  ]
})

const editorOptions = computed(() => ({
  placeholder: props.placeholder,
  theme: 'snow',
  modules: {
    toolbar: toolbarOptions.value
  }
}))

// Handler para quando o editor é montado
function onEditorReady(editor: any) {
  // O editor recebido é o wrapper, precisamos pegar a instância Quill
  const quill = editor.getQuill ? editor.getQuill() : editor
  quillEditor.value = quill
  
  if (props.enableImages) {
    // Override do handler de imagem padrão
    const toolbar = quill.getModule('toolbar')
    toolbar.addHandler('image', () => {
      fileInput.value?.click()
    })
  }

  // Add keyboard listener for mention navigation
  if (props.enableMentions) {
    const editorEl = quill.root
    editorEl.addEventListener('keydown', handleEditorKeydown)
  }
}

// Processar upload de imagem
async function handleImageUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  // Validar tipo de arquivo
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecione apenas arquivos de imagem.')
    return
  }
  
  // Validar tamanho (máximo 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    alert('A imagem deve ter no máximo 5MB.')
    return
  }
  
  // Converter para base64
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    insertImage(base64)
  }
  reader.readAsDataURL(file)
  
  // Limpar input
  input.value = ''
}

// Inserir imagem no editor
function insertImage(url: string) {
  const editor = quillEditor.value
  if (!editor || !editor.getSelection) return
  
  const range = editor.getSelection(true)
  editor.insertEmbed(range.index, 'image', url)
  editor.setSelection(range.index + 1)
}

// Mention handling functions
function handleEditorKeydown(event: KeyboardEvent) {
  if (!props.enableMentions || !showMentionPopover.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedMentionIndex.value = Math.min(
      selectedMentionIndex.value + 1,
      filteredMembers.value.length - 1
    )
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedMentionIndex.value = Math.max(selectedMentionIndex.value - 1, 0)
  } else if (event.key === 'Enter' && showMentionPopover.value) {
    event.preventDefault()
    if (filteredMembers.value[selectedMentionIndex.value]) {
      selectMention(filteredMembers.value[selectedMentionIndex.value])
    }
  } else if (event.key === 'Escape') {
    closeMentionPopover()
  }
}

function checkForMention() {
  if (!props.enableMentions) return

  const editor = quillEditor.value
  if (!editor || !editor.getSelection) return

  const selection = editor.getSelection()
  if (!selection) return

  const cursorPos = selection.index
  const text = editor.getText(0, cursorPos)

  // Find the last @ symbol before cursor
  const lastAtIndex = text.lastIndexOf('@')
  
  if (lastAtIndex === -1) {
    closeMentionPopover()
    return
  }

  // Check if there's a space between @ and cursor (means mention is complete or cancelled)
  const textAfterAt = text.substring(lastAtIndex + 1)
  if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
    closeMentionPopover()
    return
  }

  // Get the query text after @
  mentionQuery.value = textAfterAt
  mentionStartIndex.value = lastAtIndex

  // Calculate position for popover (use absolute screen coordinates for Teleport)
  const bounds = editor.getBounds(cursorPos)
  if (bounds && editorContainer.value) {
    const containerRect = editorContainer.value.getBoundingClientRect()
    // Add scroll offset and container position to get absolute screen position
    mentionPosition.value = {
      top: containerRect.top + bounds.top + bounds.height + 5,
      left: containerRect.left + bounds.left
    }
  }

  // Debug log
  console.log('Mention check:', { 
    query: mentionQuery.value, 
    membersCount: props.members.length,
    filteredCount: filteredMembers.value.length,
    position: mentionPosition.value
  })

  showMentionPopover.value = true
  selectedMentionIndex.value = 0
}

function selectMention(member: MentionMember) {
  const editor = quillEditor.value
  if (!editor || !editor.getSelection || mentionStartIndex.value === null) return

  const selection = editor.getSelection()
  if (!selection) return

  // Delete the @ and query text
  const deleteLength = selection.index - mentionStartIndex.value
  editor.deleteText(mentionStartIndex.value, deleteLength)

  // Insert the mention as styled text
  const mentionText = `@${member.name}`
  editor.insertText(mentionStartIndex.value, mentionText, {
    'color': '#6366f1',
    'bold': true
  })

  // Add a space after the mention
  editor.insertText(mentionStartIndex.value + mentionText.length, ' ')
  editor.setSelection(mentionStartIndex.value + mentionText.length + 1)

  // Emit mention event
  emit('mention', member)

  closeMentionPopover()
  
  // Update internal content
  nextTick(() => {
    onTextChange()
  })
}

function closeMentionPopover() {
  showMentionPopover.value = false
  mentionQuery.value = ''
  mentionStartIndex.value = null
  selectedMentionIndex.value = 0
}

// Extended onTextChange to check for mentions
function onTextChange() {
  modelValue.value = internalContent.value
  
  if (props.enableMentions) {
    nextTick(() => {
      checkForMention()
    })
  }
}

// Cleanup
onUnmounted(() => {
  if (quillEditor.value && props.enableMentions) {
    const editorEl = quillEditor.value.root
    editorEl?.removeEventListener('keydown', handleEditorKeydown)
  }
})
</script>

<template>
  <div ref="editorContainer" class="rich-editor relative">
    <!-- Input oculto para upload de imagem -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleImageUpload"
    />
    
    <ClientOnly>
      <QuillEditor
        ref="quillEditor"
        v-model:content="internalContent"
        content-type="html"
        :options="editorOptions"
        :style="{ height: height }"
        @text-change="onTextChange"
        @ready="onEditorReady"
      />
      <template #fallback>
        <div 
          class="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg"
          :style="{ height: height }"
        />
      </template>
    </ClientOnly>
  </div>

  <!-- Mention Popover - Teleported to body to avoid overflow/z-index issues -->
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
        v-if="showMentionPopover && props.enableMentions && filteredMembers.length > 0"
        class="mention-popover fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto min-w-[200px]"
        :style="{ top: `${mentionPosition.top}px`, left: `${mentionPosition.left}px`, zIndex: 99999 }"
      >
        <div class="p-1">
          <p class="text-xs text-gray-400 px-2 py-1 mb-1">Mencionar membro</p>
          <button
            v-for="(member, index) in filteredMembers"
            :key="member.id"
            @click="selectMention(member)"
            @mouseenter="selectedMentionIndex = index"
            class="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors"
            :class="[
              selectedMentionIndex === index
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            ]"
          >
            <UAvatar :alt="member.name" :src="member.avatar" size="2xs" />
            <span class="truncate">{{ member.name }}</span>
          </button>
          <p v-if="filteredMembers.length === 0" class="text-sm text-gray-400 px-2 py-2">
            Nenhum membro encontrado
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rich-editor {
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid rgb(229 231 235);
}

:global(.dark) .rich-editor {
  border-color: rgb(55 65 81);
}

.rich-editor :deep(.ql-toolbar) {
  border: 0;
  border-bottom: 1px solid rgb(229 231 235);
  background-color: rgb(249 250 251);
}

:global(.dark) .rich-editor :deep(.ql-toolbar) {
  border-bottom-color: rgb(55 65 81);
  background-color: rgb(31 41 55);
}

.rich-editor :deep(.ql-container) {
  border: 0;
  background-color: white;
  font-family: inherit;
  font-size: 0.875rem;
}

:global(.dark) .rich-editor :deep(.ql-container) {
  background-color: rgb(17 24 39);
}

.rich-editor :deep(.ql-editor) {
  color: rgb(17 24 39);
  min-height: 100%;
}

:global(.dark) .rich-editor :deep(.ql-editor) {
  color: rgb(243 244 246);
}

.rich-editor :deep(.ql-editor.ql-blank::before) {
  color: rgb(156 163 175);
  font-style: normal;
}

:global(.dark) .rich-editor :deep(.ql-editor.ql-blank::before) {
  color: rgb(107 114 128);
}

.rich-editor :deep(.ql-snow .ql-stroke) {
  stroke: rgb(75 85 99);
}

:global(.dark) .rich-editor :deep(.ql-snow .ql-stroke) {
  stroke: rgb(156 163 175);
}

.rich-editor :deep(.ql-snow .ql-fill) {
  fill: rgb(75 85 99);
}

:global(.dark) .rich-editor :deep(.ql-snow .ql-fill) {
  fill: rgb(156 163 175);
}

.rich-editor :deep(.ql-snow .ql-picker) {
  color: rgb(75 85 99);
}

:global(.dark) .rich-editor :deep(.ql-snow .ql-picker) {
  color: rgb(156 163 175);
}

.rich-editor :deep(.ql-snow .ql-picker-options) {
  background-color: white;
  border-color: rgb(229 231 235);
}

:global(.dark) .rich-editor :deep(.ql-snow .ql-picker-options) {
  background-color: rgb(31 41 55);
  border-color: rgb(55 65 81);
}

.rich-editor :deep(.ql-snow .ql-picker-item:hover) {
  color: rgb(79 70 229);
}

.rich-editor :deep(.ql-snow.ql-toolbar button:hover),
.rich-editor :deep(.ql-snow .ql-toolbar button:hover),
.rich-editor :deep(.ql-snow.ql-toolbar button.ql-active),
.rich-editor :deep(.ql-snow .ql-toolbar button.ql-active) {
  color: rgb(79 70 229);
}

.rich-editor :deep(.ql-snow.ql-toolbar button:hover .ql-stroke),
.rich-editor :deep(.ql-snow .ql-toolbar button:hover .ql-stroke),
.rich-editor :deep(.ql-snow.ql-toolbar button.ql-active .ql-stroke),
.rich-editor :deep(.ql-snow .ql-toolbar button.ql-active .ql-stroke) {
  stroke: rgb(79 70 229);
}

.rich-editor :deep(.ql-snow.ql-toolbar button:hover .ql-fill),
.rich-editor :deep(.ql-snow .ql-toolbar button:hover .ql-fill),
.rich-editor :deep(.ql-snow.ql-toolbar button.ql-active .ql-fill),
.rich-editor :deep(.ql-snow .ql-toolbar button.ql-active .ql-fill) {
  fill: rgb(79 70 229);
}

/* Code block styling */
.rich-editor :deep(.ql-snow .ql-editor pre.ql-syntax) {
  background-color: rgb(31 41 55);
  color: rgb(243 244 246);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

/* Link styling */
.rich-editor :deep(.ql-snow .ql-editor a) {
  color: rgb(79 70 229);
  text-decoration: underline;
}

:global(.dark) .rich-editor :deep(.ql-snow .ql-editor a) {
  color: rgb(129 140 248);
}

/* Lists */
.rich-editor :deep(.ql-snow .ql-editor ul),
.rich-editor :deep(.ql-snow .ql-editor ol) {
  padding-left: 1rem;
}

/* Images */
.rich-editor :deep(.ql-snow .ql-editor img) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 0.5rem 0;
  cursor: pointer;
}

.rich-editor :deep(.ql-snow .ql-editor img:hover) {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

/* Mention popover positioning */
.mention-popover {
  max-width: 280px;
}
</style>
