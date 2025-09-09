'use server'

import { connectToDatabase } from '@/lib/mongoose'
import { ICreateLesson, ILessonFields, IUpdatePosition } from './types'
import Section from '@/database/section.model'
import Lesson from '@/database/lesson.model'
import { revalidatePath } from 'next/cache'
import UserProgress from '@/database/user-progress.model'
import { ILesson } from '@/app.types'

export const getLessons = async (section: string) => {
	try {
		await connectToDatabase()
		return await Lesson.find({ section }).sort({ position: 1 })
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const createLesson = async (params: ICreateLesson) => {
	try {
		await connectToDatabase()
		const { lesson, section, path } = params
		const duration = {
			hours: Number(lesson.hours),
			minutes: Number(lesson.minutes),
			seconds: Number(lesson.seconds),
		}

		const existSection = await Section.findById(section)
		const position = existSection.lessons.length

		const newLesson = await Lesson.create({
			...lesson,
			position,
			duration,
			section,
		})
		existSection.lessons.push(newLesson._id)
		existSection.save()
		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const deleteLesson = async (id: string, path: string) => {
	try {
		await connectToDatabase()
		const lesson = await Lesson.findById(id)
		const section = await Section.findById(lesson.section)
		section.lessons.pull(id)
		section.save()
		await Lesson.findByIdAndDelete(id)
		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const editLesson = async (
	lesson: ILessonFields,
	lessonId: string,
	path: string
) => {
	try {
		await connectToDatabase()
		const duration = {
			hours: Number(lesson.hours),
			minutes: Number(lesson.minutes),
			seconds: Number(lesson.seconds),
		}

		await Lesson.findByIdAndUpdate(lessonId, { ...lesson, duration })
		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const editLessonPosition = async (params: IUpdatePosition) => {
	try {
		await connectToDatabase()
		const { lists, path } = params
		for (const item of lists) {
			await Lesson.findByIdAndUpdate(item._id, { position: item.position })
		}

		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const completeLesson = async (
	lessonId: string,
	userId: string,
	path: string
) => {
	try {
		await connectToDatabase()
		const userProgress = await UserProgress.findOne({ userId, lessonId })
		if (userProgress) {
			userProgress.isCompleted = true
			await userProgress.save()
		} else {
			const newUserProgress = new UserProgress({
				userId,
				lessonId,
				isCompleted: true,
			})
			const lesson = await Lesson.findById(lessonId)
			lesson.userProgress.push(newUserProgress._id)
			await lesson.save()
			await newUserProgress.save()
		}

		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const uncompleteLesson = async (lessonId: string, path: string) => {
	try {
		await connectToDatabase()
		await UserProgress.findOneAndDelete({ lessonId })

		revalidatePath(path)
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const getLesson = async (id: string) => {
	try {
		await connectToDatabase()
		return await Lesson.findById(id).select('title content videoUrl')
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const getNextLesson = async (lessonId: string, courseId: string) => {
	try {
		await connectToDatabase()
		const sections = await Section.find({ course: courseId }).populate({
			path: 'lessons',
			options: { sort: { position: 1 } },
			model: Lesson,
		})

		const lessons: ILesson[] = sections.map(section => section.lessons).flat()

		const lessonIndex = lessons.findIndex(
			item => item._id.toString() === lessonId
		)

		if (lessonIndex === lessons.length - 1) {
			return null
		}

		const nextLesson = lessons[lessonIndex + 1]

		const section = await Section.findOne({ lessons: nextLesson._id })

		return {
			lessonId: nextLesson._id.toString(),
			sectionId: section._id.toString(),
		}
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}

export const getLastLesson = async (clerkId: string, courseId: string) => {
  try {
    await connectToDatabase()

    // Sektsiyalarni tartib bilan va darslarni tartib bilan olib kelamiz
    const sections = await Section.find({ course: courseId })
      .sort({ position: 1 })
      .populate({
        path: 'lessons',
        model: Lesson,
        select: 'position userProgress', // _id default bo'ladi
        options: { sort: { position: 1 } },
      })

    if (!sections || sections.length === 0) {
      // Kursda section yo'q
      return null
    }

    // Ichidan birinchi dars bor sectionni topamiz (fallback uchun)
    const firstWithLesson = sections.find(s => Array.isArray(s.lessons) && s.lessons.length > 0)
    if (!firstWithLesson) {
      // Hech qaysi sectionda dars yo'q
      return null
    }

    // Barcha darslarni tekislaymiz
    const lessons: ILesson[] = sections.flatMap(s => (s.lessons as ILesson[]))

    // Foydalanuvchining eng so'nggi tugallagan darsini topamiz
    const last = await UserProgress.find({
      userId: clerkId,
      lessonId: { $in: lessons.map(l => l._id) },
      isCompleted: true,
    })
      .sort({ createdAt: -1, _id: -1 }) // eng YANGISI birinchi bo'ladi
      .limit(1)

    // Agar hali tugallangan dars bo'lmasa → birinchi mavjud darsga yo'naltiramiz
    if (!last.length) {
      const firstLesson = firstWithLesson.lessons[0] as any
      return {
        sectionId: firstWithLesson._id.toString(),
        lessonId: firstLesson._id.toString(),
      }
    }

    const chosenLessonId = last[0].lessonId.toString()

    // sectionId’ni qo‘shimcha querysiz, mavjud sections ichidan topamiz
    const containingSection = sections.find(s =>
      (s.lessons as ILesson[]).some(l => l._id.toString() === chosenLessonId)
    )

    if (!containingSection) {
      // Juda kam uchraydi, lekin himoya
      return null
    }

    return {
      lessonId: chosenLessonId,
      sectionId: containingSection._id.toString(),
    }
  } catch (err) {
    console.error('[getLastLesson] error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`[getLastLesson] ${msg}`)
  }
}


export const getFreeLessons = async (courseId: string) => {
	try {
		await connectToDatabase()
		const sections = await Section.find({ course: courseId }).populate({
			path: 'lessons',
			model: Lesson,
			select: 'title videoUrl duration',
			match: { free: true },
		})

		const lessons = sections.map(section => section.lessons).flat()

		return JSON.parse(JSON.stringify(lessons))
	} catch (error) {
		throw new Error('Something went wrong!')
	}
}
