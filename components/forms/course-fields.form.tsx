'use client'

import { courseSchema } from '@/lib/validation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { courseCategory, courseLanguage, courseLevels } from '@/constants'
import { Button } from '../ui/button'
import { createCourse } from '@/actions/course.action'
import { toast } from 'sonner'
import { ChangeEvent, useState } from 'react'
import { getDownloadURL, ref, uploadString } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { ImageDown } from 'lucide-react'
import { Dialog, DialogContent } from '../ui/dialog'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { v4 as uuidv4 } from 'uuid'

function CourseFieldsForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')                   // ← old previewImage o‘rnini bosadi
  const [previewMime, setPreviewMime] = useState<string | null>(null) // ← video/ image turlari
  const [open, setOpen] = useState(false)

  const router = useRouter()
  const { user } = useUser()

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: defaultVal,
  })

  function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || !files[0]) return
    const file = files[0]

    // (ixtiyoriy) Tip chek: faqat image/* yoki video/* qabul qilamiz
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Faqat rasm yoki video yuklashingiz mumkin.')
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string
      const path = `/educa/course/${uuidv4()}`
      const storageRef = ref(storage, path)

      // MUHIM: Firebase’ga to‘g‘ri contentType bilan yozamiz
      const promise = uploadString(storageRef, dataUrl, 'data_url', {
        contentType: file.type,
      })
        .then(() => getDownloadURL(storageRef))
        .then(url => {
          setPreviewUrl(url)
          setPreviewMime(file.type)
        })

      toast.promise(promise, {
        loading: 'Uploading...',
        success: 'Successfully uploaded!',
        error: 'Something went wrong!',
      })
    }
  }

  function onSubmit(values: z.infer<typeof courseSchema>) {
    if (!previewUrl) {
      return toast.error('Please upload a preview media (image or video)')
    }

    setIsLoading(true)
    const { oldPrice, currentPrice } = values

    // Backend eski maydon nomiga mos: previewImage (URL)
    // Qo‘shimcha ravishda previewMime ham jo‘natamiz (backend qabul qilsa foydali bo‘ladi)
    const payload: any = {
      ...values,
      oldPrice: +oldPrice,
      currentPrice: +currentPrice,
      previewImage: previewUrl,
      previewMime, // ixtiyoriy — schema/DB ga qo‘shmoqchi bo‘lsang foydali
    }

    const promise = createCourse(payload, user?.id as string)
      .then(() => {
        form.reset()
        setPreviewUrl('')
        setPreviewMime(null)
        router.push('/en/instructor/my-courses')
      })
      .finally(() => setIsLoading(false))

    toast.promise(promise, {
      loading: 'Loading...',
      success: 'Successfully created!',
      error: 'Something went wrong!',
    })
  }

  const isImage = previewMime?.startsWith('image/')
  const isVideo = previewMime?.startsWith('video/')

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3'>
          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Course title<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className='bg-secondary'
                    placeholder='Learn ReactJS - from 0 to hero'
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Short description<span className='text-red-500'>*</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className='h-44 bg-secondary'
                    placeholder='Description'
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='learning'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    What will students learn in your course?
                    <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className='bg-secondary'
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='requirements'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Requirements
                    <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className='bg-secondary'
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-3 gap-4'>
            <FormField
              control={form.control}
              name='level'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Level<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className='w-full bg-secondary'>
                        <SelectValue placeholder={'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        {courseLevels.map(item => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='category'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Category<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className='w-full bg-secondary'>
                        <SelectValue placeholder={'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        {courseCategory.map(item => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='language'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Language<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <SelectTrigger className='w-full bg-secondary'>
                        <SelectValue placeholder={'Select'} />
                      </SelectTrigger>
                      <SelectContent>
                        {courseLanguage.map(item => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='oldPrice'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Old price<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className='bg-secondary'
                      type='number'
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='currentPrice'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Current Price<span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className='bg-secondary'
                      type='number'
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>
                Preview media (image/video)
                <span className='text-red-500'>*</span>
              </FormLabel>
              <Input
                className='bg-secondary'
                type='file'
                accept='image/*,video/*'        // ← image va video qabul qiladi
                disabled={isLoading}
                onChange={onUpload}
              />
            </FormItem>
          </div>

          {/* Quick inline preview (kichik) */}
          {previewUrl && (
            <div className='mt-2'>
              {isImage && (
                // Next/Image remote domains ruxsati kerak bo‘lishi mumkin
                <Image
                  src={previewUrl}
                  alt='preview-media'
                  width={320}
                  height={180}
                  className='rounded object-cover'
                />
              )}
              {isVideo && (
                <video
                  src={previewUrl}
                  controls
                  className='max-w-xs rounded'
                  playsInline
                />
              )}
            </div>
          )}

          <div className='flex justify-end gap-4'>
            <Button
              type='button'
              variant={'destructive'}
              onClick={() => {
                form.reset()
                setPreviewUrl('')
                setPreviewMime(null)
              }}
              disabled={isLoading}
            >
              Clear
            </Button>
            <Button type='submit' disabled={isLoading}>
              Submit
            </Button>
            {previewUrl && (
              <Button
                type='button'
                variant={'outline'}
                onClick={() => setOpen(true)}
              >
                <span>{isVideo ? 'Video' : 'Image'}</span>
                <ImageDown className='ml-2 size-4' />
              </Button>
            )}
          </div>
        </form>
      </Form>

      {/* Dialog preview (katta) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='space-y-3'>
          <div className='relative h-72'>
            {isImage && (
              <Image
                src={previewUrl}
                alt='preview-media-large'
                fill
                className='object-cover rounded'
              />
            )}
            {isVideo && (
              <video
                src={previewUrl}
                controls
                className='h-72 w-full rounded object-contain'
                playsInline
              />
            )}
          </div>
          <Button
            className='w-fit'
            variant={'destructive'}
            onClick={() => {
              setPreviewUrl('')
              setPreviewMime(null)
              setOpen(false)
            }}
          >
            Remove
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CourseFieldsForm

const defaultVal = {
  title: '',
  description: '',
  learning: '',
  requirements: '',
  level: '',
  category: '',
  language: '',
  oldPrice: '',
  currentPrice: '',
}
