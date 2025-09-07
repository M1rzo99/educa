'use server'

import { connectToDatabase } from '@/lib/mongoose'
import { GetPaginationParams, ICreateUser, IUpdateUser } from './types'
import User from '@/database/user.model'
import { revalidatePath } from 'next/cache'
import Review from '@/database/review.model'
import Course from '@/database/course.model'
import { cache } from 'react'

// helper: _id ni stringga aylantirish
const normalizeId = (doc: any) => {
  if (!doc) return doc
  if (doc._id && typeof doc._id !== 'string') doc._id = String(doc._id)
  return doc
}

export const createUser = async (data: ICreateUser) => {
  try {
    await connectToDatabase()
    const { clerkId, email, fullName, picture } = data
    const isExist = await User.findOne({ clerkId }).select('_id').lean()

    if (isExist) {
      const updatedUser = await User.findOneAndUpdate(
        { clerkId },
        { $set: { fullName, picture, email } },
        {
          new: true,
          runValidators: true,
          lean: true,
          projection: 'fullName picture email clerkId role isAdmin _id',
        }
      )
      return normalizeId(updatedUser)
    }

    const created = await User.create(data) // doc
    const obj = created.toObject()
    return normalizeId(obj)
  } catch (error) {
    throw new Error('Error creating user. Please try again.')
  }
}

export const updateUser = async (data: IUpdateUser) => {
  try {
    await connectToDatabase()
    const { clerkId, updatedData, path } = data
    const updateduser = await User.findOneAndUpdate(
      { clerkId },
      { $set: updatedData },
      { new: true, runValidators: true, lean: true }
    )
    if (path) return revalidatePath(path)
    return normalizeId(updateduser)
  } catch (error) {
    throw new Error('Error updating user. Please try again.')
  }
}

export const getUserById = cache(async (clerkId: string) => {
  try {
    await connectToDatabase()
    const user = await User.findOne({ clerkId })
      .lean()
      .select('fullName picture clerkId email role isAdmin _id')
    return normalizeId(user)
  } catch (error) {
    throw new Error('Error fetching user. Please try again.')
  }
})

export const getUser = async (clerkId: string) => {
  try {
    await connectToDatabase()
    const user = await User.findOne({ clerkId })
      .select('fullName picture clerkId email role isAdmin _id')
      .lean()
    if (!user) return 'notFound'
    return normalizeId(user)
  } catch (error) {
    throw new Error('Error fetching user. Please try again.')
  }
}

export const getUserReviews = async (clerkId: string) => {
  try {
    await connectToDatabase()
    const user = await User.findOne({ clerkId }).select('_id').lean()
    if (!user || Array.isArray(user)) return []

    const reviews = await Review.find({ user: (user as { _id: unknown })._id })
      .sort({ createdAt: -1 })
      .populate({ path: 'user', model: User, select: 'fullName picture _id' })
      .populate({ path: 'course', model: Course, select: 'title _id' })
      .lean()

    return reviews.map((r: any) => {
      normalizeId(r)
      if (r.user) normalizeId(r.user)
      if (r.course) normalizeId(r.course)
      return r
    })
  } catch (error) {
    throw new Error('Error getting user reviews')
  }
}

export const getAdminInstructors = async (params: GetPaginationParams) => {
  try {
    await connectToDatabase()
    const { page = 1, pageSize = 3 } = params
    const skipAmount = (page - 1) * pageSize

    const instructors = await User.find({ role: 'instructor' })
      .skip(skipAmount)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .lean()

    const totalInstructors = await User.countDocuments({ role: 'instructor' })
    const isNext = totalInstructors > skipAmount + instructors.length

    return {
      instructors: instructors.map((i: any) => normalizeId(i)),
      isNext,
      totalInstructors,
    }
  } catch (error) {
    throw new Error('Error getting instructors')
  }
}

export const getInstructors = async () => {
  try {
    await connectToDatabase()
    const list = await User.find({ approvedInstructor: true })
      .select('isAdmin role email website youtube github job clerkId _id')
      .lean()
    return list.map((u: any) => normalizeId(u))
  } catch (error) {
    throw new Error('Error getting instructors')
  }
}

export const getRole = async (clerkId: string) => {
  try {
    await connectToDatabase()
    const user = await User.findOne({ clerkId })
      .select('role isAdmin _id')
      .lean()
    return normalizeId(user)
  } catch (error) {
    throw new Error('Error getting role')
  }
}
