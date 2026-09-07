/* eslint-disable react/prop-types */

// Frontend-only compatibility layer.
//
// Existing public page markup uses <Editable> wrappers. On the static public
// website those wrappers are intentionally transparent: no admin mode, uploads,
// authentication, database writes, or API calls are mounted.

const STATIC_EDIT_MODE = Object.freeze({
  editMode: false,
  setEditMode: () => {},
})

export function EditModeProvider({ children }) {
  return children
}

export function useEditMode() {
  return STATIC_EDIT_MODE
}

export function EditModeToggle() {
  return null
}

export function Editable({ children }) {
  return children
}
