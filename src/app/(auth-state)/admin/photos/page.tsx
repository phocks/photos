import { Fragment } from 'react';
import PhotoUploadInput from '@/photo/PhotoUploadInput';
import Link from 'next/link';
import PhotoTiny from '@/photo/PhotoTiny';
import { cc } from '@/utility/css';
import ImageTiny from '@/components/ImageTiny';
import FormWithConfirm from '@/components/FormWithConfirm';
import SiteGrid from '@/components/SiteGrid';
import {
  deletePhotoAction,
  deleteBlobPhotoAction,
  syncCacheAction,
} from '@/photo/actions';
import SubmitButtonWithStatus from '@/components/SubmitButtonWithStatus';
import { pathForBlobUrl } from '@/services/blob';
import {
  pathForAdminPhotos,
  pathForPhoto,
  pathForAdminPhotoEdit,
} from '@/site/paths';
import { titleForPhoto } from '@/photo';
import MorePhotos from '@/components/MorePhotos';
import {
  getBlobPhotoUrlsCached,
  getBlobUploadUrlsCached,
  getPhotosCached,
  getPhotosCountIncludingHiddenCached,
} from '@/cache';
import { AiOutlineEyeInvisible } from 'react-icons/ai';
import { BiTrash } from 'react-icons/bi';
import {
  PaginationParams,
  getPaginationForSearchParams,
} from '@/site/pagination';
import AdminGrid from '@/admin/AdminGrid';
import DeleteButton from '@/admin/DeleteButton';
import EditButton from '@/admin/EditButton';

export const runtime = 'edge';

const DEBUG_PHOTO_BLOBS = false;

export default async function AdminTagsPage({
  searchParams,
}: PaginationParams) {
  const { offset, limit } = getPaginationForSearchParams(searchParams);

  const [
    photos,
    count,
    blobUploadUrls,
    blobPhotoUrls,
  ] = await Promise.all([
    getPhotosCached({ includeHidden: true, sortBy: 'createdAt', limit }),
    getPhotosCountIncludingHiddenCached(),
    getBlobUploadUrlsCached(),
    DEBUG_PHOTO_BLOBS ? getBlobPhotoUrlsCached() : [],
  ]);

  const showMorePhotos = count > photos.length;

  return (
    <SiteGrid
      contentMain={
        <div className="space-y-6">
          <div className="flex items-center">
            <div className="flex-grow">
              <PhotoUploadInput />
            </div>
            <form
              className="hidden md:block"
              action={syncCacheAction}
            >
              <SubmitButtonWithStatus
                icon={<BiTrash />}
              >
                Clear Cache
              </SubmitButtonWithStatus>
            </form>
          </div>
          {blobUploadUrls.length > 0 &&
            <BlobUrls
              blobUrls={blobUploadUrls}
              label={`Uploads Files (${blobUploadUrls.length})`}
            />}
          {blobPhotoUrls.length > 0 &&
            <BlobUrls
              blobUrls={blobPhotoUrls}
              label={`Photos Files (${blobPhotoUrls.length})`}
            />}
          <div className="space-y-4">
            <AdminGrid>
              {photos.map(photo =>
                <Fragment key={photo.id}>
                  <PhotoTiny
                    className={cc(
                      'rounded-sm overflow-hidden',
                      'border border-gray-200 dark:border-gray-800',
                    )}
                    photo={photo}
                  />
                  <div className="flex flex-col md:flex-row">
                    <Link
                      key={photo.id}
                      href={pathForPhoto(photo)}
                      className="sm:w-[50%] flex items-center gap-2"
                    >
                      <span className={cc(
                        'inline-flex items-center gap-2',
                        photo.hidden && 'text-dim',
                      )}>
                        <span>{photo.title || 'Untitled'}</span>
                        {photo.hidden &&
                          <AiOutlineEyeInvisible
                            className="translate-y-[0.25px]"
                            size={16}
                          />}
                      </span>
                      {photo.priorityOrder !== null &&
                        <span className={cc(
                          'text-xs leading-none px-1.5 py-1 rounded-sm',
                          'dark:text-gray-300',
                          'bg-gray-100 dark:bg-gray-800',
                        )}>
                          {photo.priorityOrder}
                        </span>}
                    </Link>
                    <div className={cc(
                      'sm:w-[50%] uppercase',
                      'text-dim',
                    )}>
                      {photo.takenAtNaive}
                    </div>
                  </div>
                  <EditButton href={pathForAdminPhotoEdit(photo)} />
                  <FormWithConfirm
                    action={deletePhotoAction}
                    confirmText={
                      // eslint-disable-next-line max-len
                      `Are you sure you want to delete "${titleForPhoto(photo)}?"`}
                  >
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="url" value={photo.url} />
                    <DeleteButton />
                  </FormWithConfirm>
                </Fragment>)}
            </AdminGrid>
            {showMorePhotos &&
              <MorePhotos path={pathForAdminPhotos(offset + 1)} />}
          </div>
        </div>}
    />
  );
}

function BlobUrls ({
  blobUrls,
  label,
}: {
  blobUrls: string[],
  label: string,
}) {
  return <AdminGrid title={label}>
    {blobUrls.map(url => {
      const href = `/admin/uploads/${encodeURIComponent(url)}`;
      const fileName = url.split('/').pop();
      return <Fragment key={url}>
        <Link href={href}>
          <ImageTiny
            alt={`Photo: ${fileName}`}
            src={url}
            aspectRatio={3.0 / 2.0}
            className={cc(
              'rounded-sm overflow-hidden',
              'border border-gray-200 dark:border-gray-800',
            )}
          />
        </Link>
        <Link
          href={href}
          className="break-all"
          title={url}
        >
          {pathForBlobUrl(url)}
        </Link>
        <EditButton href={href} label="Setup" />
        <FormWithConfirm
          action={deleteBlobPhotoAction}
          confirmText="Are you sure you want to delete this upload?"
        >
          <input type="hidden" name="url" value={url} />
          <DeleteButton />
        </FormWithConfirm>
      </Fragment>;})}
  </AdminGrid>;
}
