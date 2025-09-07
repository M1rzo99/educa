'use client'

import { SignOutButton } from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger, // ⬅️ shadcn/ui dan oling
} from '../ui/dropdown-menu'
import { Avatar, AvatarImage } from '../ui/avatar'
import Link from 'next/link'
import useTranslate from '@/hooks/use-translate'
import useUser from '@/hooks/use-user'
import { useParams } from 'next/navigation' // ⬅️ i18n uchun

function UserBox() {
  const { user } = useUser()
  const t = useTranslate()
  const { lng } = useParams() as { lng: string }

  const isAdmin = Boolean(user?.isAdmin)
  const isInstructor =
    user?.role === 'instructor' || Boolean((user as any)?.approvedInstructor) || isAdmin

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className='size-10 cursor-pointer'>
          <AvatarImage src={user?.picture || ''} className='object-cover' />
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-80' align='start' alignOffset={11} forceMount>
        <div className='flex flex-col space-y-4 p-2'>
          <p className='text-xs font-medium leading-none text-muted-foreground'>
            {user?.email}
          </p>

          <div className='flex items-center gap-x-2'>
            <div className='rounded-md bg-secondary p-1'>
              <Avatar className='size-8'>
                <AvatarImage src={user?.picture || ''} />
              </Avatar>
            </div>

            <div className='space-y-1'>
              <p className='line-clamp-1 font-space-grotesk text-sm'>
                {user?.fullName}
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {isAdmin && (
          <DropdownMenuItem asChild className='w-full cursor-pointer text-muted-foreground'>
            <Link href={`/${lng}/admin`}>{t('admin')}</Link>
          </DropdownMenuItem>
        )}

        {isInstructor && (
          <DropdownMenuItem asChild className='w-full cursor-pointer text-muted-foreground'>
            <Link href={`/${lng}/instructor`}>{t('instructor')}</Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem asChild className='w-full cursor-pointer text-muted-foreground'>
          <Link href={`/${lng}/profile`}>{t('manageAccount')}</Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className='w-full cursor-pointer text-muted-foreground'>
          <SignOutButton signOutCallback={() => { window.location.href = `/${lng}` }}>{t('logout')}</SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserBox
