import { ensureContent } from '../engine/generate'
import type { LessonBundle } from '../state/store'
import { supabase } from './supabase'

export interface SavedLesson {
  id: string
  owner_id: string
  title: string
  subject: string
  grade: string
  lesson_text: string
  bundle: Omit<LessonBundle, 'remoteId'>
  created_at: string
  updated_at: string
}

const CACHE = 'droos:library'

/** Last library fetched from Supabase — shown instantly, then refreshed. */
export function cachedLessons(): SavedLesson[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE) ?? '[]')
  } catch {
    return []
  }
}

export async function fetchLessons(): Promise<SavedLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, owner_id, title, subject, grade, lesson_text, bundle, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  try {
    localStorage.setItem(CACHE, JSON.stringify(data))
  } catch {
    /* storage full: the library still works online */
  }
  return data as SavedLesson[]
}

export function toBundle(s: SavedLesson): LessonBundle {
  const b = s.bundle
  return { ...b, content: ensureContent(b.lesson, b.analysis, b.content), remoteId: s.id }
}

export async function saveLesson(bundle: LessonBundle): Promise<string> {
  const { remoteId, ...rest } = bundle
  const row = {
    title: bundle.lesson.title,
    subject: bundle.lesson.subject,
    grade: bundle.lesson.grade,
    lesson_text: bundle.lesson.content,
    bundle: rest,
  }
  if (remoteId) {
    const { error } = await supabase.from('lessons').update(row).eq('id', remoteId)
    if (error) throw new Error(error.message)
    return remoteId
  }
  const { data, error } = await supabase.from('lessons').insert(row).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

export async function deleteLesson(id: string) {
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw new Error(error.message)
  try {
    localStorage.setItem(CACHE, JSON.stringify(cachedLessons().filter((l) => l.id !== id)))
  } catch {
    /* ignore */
  }
}
