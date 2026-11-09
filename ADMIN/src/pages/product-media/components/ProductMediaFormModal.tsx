
import {
    useEffect,
    useMemo,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import {
    Film,
    Image as ImageIcon,
    Link2,
    MonitorUp,
    Trash2,
    Upload,
    X,
    Package,
    Images,
    Settings2,
    CheckCircle2,
} from 'lucide-react';

import Modal from '../../../components/ui/overlays/Modal';
import { Button } from '../../../components/ui/buttons/Button';

import type { Product } from '../../../types/product.types';
import type {
    MediaType,
    ProductMedia,
    ProductMediaPayload,
} from '../../../types/product-media.types';

interface ProductMediaFormValues {
    productId: string;
    mediaList: ProductMediaPayload[];
    files?: File[];
}

interface ProductMediaFormModalProps {
    open: boolean;
    products: Product[];
    editingMedia: ProductMedia | null;
    saving: boolean;
    submitError?: string;
    onClose: () => void;
    onSubmit: (values: ProductMediaFormValues) => Promise<void>;
}

type InputMode = 'url' | 'upload';

interface SelectedFile {
    file: File;
    previewUrl: string;
}

const MAX_FILES = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
];

const inputClassName =
    'w-full rounded-xl border border-border-strong bg-bg-app px-3.5 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 disabled:cursor-not-allowed disabled:opacity-60';

const labelClassName =
    'block text-sm font-medium text-text-secondary';

const sectionClassName =
    'rounded-xl border border-border-default bg-bg-surface p-4 sm:p-5';

const getProductId = (product: Product): string =>
    String(product._id || product.id || '');

const isValidHttpUrl = (value: string): boolean => {
    try {
        const url = new URL(value);

        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error
    ) {
        const response = error.response;

        if (
            typeof response === 'object' &&
            response !== null &&
            'data' in response
        ) {
            const data = response.data;

            if (
                typeof data === 'object' &&
                data !== null &&
                'message' in data &&
                typeof data.message === 'string'
            ) {
                return data.message;
            }
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'Không thể lưu media. Vui lòng thử lại.';
};

const formatFileSize = (size: number): string => {
    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(0)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export function ProductMediaFormModal({
    open,
    products,
    editingMedia,
    saving,
    submitError = '',
    onClose,
    onSubmit,
}: ProductMediaFormModalProps) {
    const isEditing = Boolean(editingMedia);

    const [productId, setProductId] = useState(
        () =>
            editingMedia?.productId ||
            (products[0] ? getProductId(products[0]) : ''),
    );

    const [mediaType, setMediaType] = useState<MediaType>(
        () => editingMedia?.mediaType || 'image',
    );

    const [inputMode, setInputMode] = useState<InputMode>('url');

    const [mediaUrls, setMediaUrls] = useState(
        () => editingMedia?.mediaUrl || '',
    );

    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

    const [altText, setAltText] = useState(
        () => editingMedia?.altText ?? '',
    );

    const [sortOrder, setSortOrder] = useState(
        () => String(editingMedia?.sortOrder ?? 0),
    );

    const [isPrimary, setIsPrimary] = useState(
        () => editingMedia?.isPrimary ?? false,
    );

    const [localError, setLocalError] = useState('');

    const selectedProduct = useMemo(
        () => products.find((product) => getProductId(product) === productId),
        [products, productId],
    );

    const totalFileSize = useMemo(
        () => selectedFiles.reduce(
            (total, item) => total + item.file.size,
            0,
        ),
        [selectedFiles],
    );

    // Thu hồi URL preview khi danh sách file thay đổi hoặc component unmount.
    useEffect(() => {
        return () => {
            selectedFiles.forEach((item) => {
                URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, [selectedFiles]);

    const handleClose = () => {
        if (saving) return;
        onClose();
    };

    const handleSelectFiles = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const files = Array.from(event.target.files ?? []);

        // Cho phép chọn lại cùng một file.
        event.target.value = '';

        if (files.length === 0) return;

        setLocalError('');

        const invalidFile = files.find(
            (file) => !ACCEPTED_TYPES.includes(file.type),
        );

        if (invalidFile) {
            setLocalError(
                `"${invalidFile.name}" không đúng định dạng. Chỉ hỗ trợ JPEG, PNG, WEBP và GIF.`,
            );
            return;
        }

        const oversizedFile = files.find(
            (file) => file.size > MAX_FILE_SIZE,
        );

        if (oversizedFile) {
            setLocalError(
                `"${oversizedFile.name}" vượt quá giới hạn 5MB.`,
            );
            return;
        }

        if (selectedFiles.length + files.length > MAX_FILES) {
            setLocalError(
                `Bạn chỉ được chọn tối đa ${MAX_FILES} ảnh.`,
            );
            return;
        }

        const newFiles = files.map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
        }));

        setSelectedFiles((current) => [...current, ...newFiles]);
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles((current) =>
            current.filter((_, fileIndex) => fileIndex !== index),
        );

        setLocalError('');
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setLocalError('');

        if (!productId) {
            setLocalError('Vui lòng chọn sản phẩm.');
            return;
        }

        // Upload file ảnh trực tiếp.
        if (!isEditing && inputMode === 'upload') {
            if (mediaType !== 'image') {
                setLocalError('Chỉ hỗ trợ upload file hình ảnh.');
                return;
            }

            if (selectedFiles.length === 0) {
                setLocalError(
                    'Vui lòng chọn ít nhất một ảnh từ máy tính.',
                );
                return;
            }

            try {
                await onSubmit({
                    productId,
                    mediaList: [],
                    files: selectedFiles.map((item) => item.file),
                });
            } catch (error) {
                setLocalError(getErrorMessage(error));
            }

            return;
        }

        // Thêm hoặc cập nhật bằng URL.
        const parsedSortOrder = Number(sortOrder);

        if (
            !Number.isInteger(parsedSortOrder) ||
            parsedSortOrder < 0
        ) {
            setLocalError(
                'Thứ tự hiển thị phải là số nguyên không âm.',
            );
            return;
        }

        const urls = mediaUrls
            .split(/\r?\n/)
            .map((url) => url.trim())
            .filter(Boolean);

        if (urls.length === 0) {
            setLocalError('Vui lòng nhập đường dẫn media.');
            return;
        }

        if (isEditing && urls.length !== 1) {
            setLocalError(
                'Khi chỉnh sửa chỉ được nhập một URL media.',
            );
            return;
        }

        if (urls.length > MAX_FILES) {
            setLocalError(
                `Bạn chỉ được thêm tối đa ${MAX_FILES} URL mỗi lần.`,
            );
            return;
        }

        const invalidUrl = urls.find(
            (url) => !isValidHttpUrl(url),
        );

        if (invalidUrl) {
            setLocalError(
                `Đường dẫn media không hợp lệ: ${invalidUrl}`,
            );
            return;
        }

        const normalizedAltText = altText.trim() || null;

        const mediaList: ProductMediaPayload[] = urls.map(
            (url, index) => ({
                mediaType,
                mediaUrl: url,
                altText: normalizedAltText,
                sortOrder: parsedSortOrder + index,
                isPrimary:
                    mediaType === 'image' &&
                    isPrimary &&
                    index === 0,
            }),
        );

        try {
            await onSubmit({
                productId,
                mediaList,
            });
        } catch (error) {
            setLocalError(getErrorMessage(error));
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Chỉnh sửa media' : 'Thêm media sản phẩm'}
            maxWidth="lg"
        >
            <form
                onSubmit={handleSubmit}
                className="flex max-h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden"
            >
                {/* VÙNG NỘI DUNG CÓ THỂ CUỘN */}
                <div
                    className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-5 pr-2"
                >
                    {/* Thông báo lỗi */}
                    {(localError || submitError) && (
                        <div
                            role="alert"
                            className="flex items-start justify-between gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger"
                        >
                            <span className="leading-5">
                                {localError || submitError}
                            </span>

                            <button
                                type="button"
                                onClick={() => setLocalError('')}
                                className="shrink-0 rounded-md p-1 transition-colors hover:bg-status-danger/10"
                                aria-label="Đóng thông báo lỗi"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* NHÓM 1: THÔNG TIN SẢN PHẨM */}
                    <section className={sectionClassName}>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                                <Package size={18} />
                            </span>

                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">
                                    Thông tin sản phẩm
                                </h3>
                                <p className="mt-0.5 text-xs text-text-muted">
                                    Chọn sản phẩm cần quản lý media.
                                </p>
                            </div>
                        </div>

                        <label className="block space-y-2">
                            <span className={labelClassName}>
                                Sản phẩm{' '}
                                <span className="text-status-danger">*</span>
                            </span>

                            <select
                                required
                                value={productId}
                                disabled={
                                    isEditing ||
                                    saving ||
                                    products.length === 0
                                }
                                onChange={(event) =>
                                    setProductId(event.target.value)
                                }
                                className={inputClassName}
                            >
                                <option value="">
                                    -- Chọn sản phẩm --
                                </option>

                                {products.map((product) => {
                                    const id = getProductId(product);

                                    return (
                                        <option key={id} value={id}>
                                            {product.name}
                                            {product.sku
                                                ? ` — ${product.sku}`
                                                : ''}
                                        </option>
                                    );
                                })}
                            </select>

                            {isEditing ? (
                                <span className="block text-xs text-text-muted">
                                    Không thể thay đổi sản phẩm của media đã tạo.
                                </span>
                            ) : selectedProduct ? (
                                <span className="flex items-center gap-1.5 text-xs text-status-success">
                                    <CheckCircle2 size={13} />
                                    Đã chọn: {selectedProduct.name}
                                </span>
                            ) : null}
                        </label>
                    </section>

                    {/* NHÓM 2: CẤU HÌNH MEDIA */}
                    <section className={sectionClassName}>
                        <div className="mb-4 flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 text-accent-cyan">
                                <Settings2 size={18} />
                            </span>

                            <div>
                                <h3 className="text-sm font-semibold text-text-primary">
                                    Cấu hình media
                                </h3>
                                <p className="mt-0.5 text-xs text-text-muted">
                                    Thiết lập loại và thứ tự hiển thị.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <label className="space-y-2">
                                <span className={labelClassName}>
                                    Loại media{' '}
                                    <span className="text-status-danger">*</span>
                                </span>

                                <select
                                    required
                                    value={mediaType}
                                    disabled={saving || isEditing}
                                    onChange={(event) => {
                                        const nextType =
                                            event.target.value as MediaType;

                                        setMediaType(nextType);

                                        if (nextType === 'video') {
                                            setIsPrimary(false);
                                            setInputMode('url');
                                            setSelectedFiles([]);
                                        }
                                    }}
                                    className={inputClassName}
                                >
                                    <option value="image">Hình ảnh</option>
                                    <option value="video">Video</option>
                                </select>
                            </label>

                            <label className="space-y-2">
                                <span className={labelClassName}>
                                    Thứ tự hiển thị
                                </span>

                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={sortOrder}
                                    disabled={
                                        saving ||
                                        (inputMode === 'upload' && !isEditing)
                                    }
                                    onChange={(event) =>
                                        setSortOrder(event.target.value)
                                    }
                                    className={inputClassName}
                                />
                            </label>
                        </div>
                    </section>

                    {/* NHÓM 3: PHƯƠNG THỨC THÊM MEDIA */}
                    {!isEditing && (
                        <section className={sectionClassName}>
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                                    <Images size={18} />
                                </span>

                                <div>
                                    <h3 className="text-sm font-semibold text-text-primary">
                                        Phương thức thêm media
                                    </h3>
                                    <p className="mt-0.5 text-xs text-text-muted">
                                        Chọn cách thêm hình ảnh hoặc video.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border-default bg-bg-app p-1.5">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => {
                                        setInputMode('url');
                                        setLocalError('');
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${inputMode === 'url'
                                            ? 'bg-bg-elevated text-accent-primary shadow-sm'
                                            : 'text-text-secondary hover:bg-bg-elevated/50 hover:text-text-primary'
                                        }`}
                                >
                                    <Link2 size={17} />
                                    Nhập URL
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        saving || mediaType !== 'image'
                                    }
                                    onClick={() => {
                                        setInputMode('upload');
                                        setLocalError('');
                                    }}
                                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${inputMode === 'upload'
                                            ? 'bg-bg-elevated text-accent-primary shadow-sm'
                                            : 'text-text-secondary hover:bg-bg-elevated/50 hover:text-text-primary'
                                        }`}
                                >
                                    <MonitorUp size={17} />
                                    Upload ảnh
                                </button>
                            </div>
                        </section>
                    )}

                    {/* NHÓM 4: NHẬP URL */}
                    {(isEditing || inputMode === 'url') && (
                        <section className={sectionClassName}>
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated text-text-secondary">
                                    <Link2 size={18} />
                                </span>

                                <div>
                                    <h3 className="text-sm font-semibold text-text-primary">
                                        Đường dẫn media
                                    </h3>
                                    <p className="mt-0.5 text-xs text-text-muted">
                                        Nhập một hoặc nhiều URL tùy theo thao tác.
                                    </p>
                                </div>
                            </div>

                            <label className="block space-y-2">
                                <span className={labelClassName}>
                                    URL media{' '}
                                    <span className="text-status-danger">*</span>
                                </span>

                                <textarea
                                    required
                                    rows={isEditing ? 3 : 4}
                                    value={mediaUrls}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setMediaUrls(event.target.value)
                                    }
                                    placeholder={
                                        mediaType === 'image'
                                            ? 'https://example.com/product-image-1.jpg\nhttps://example.com/product-image-2.jpg'
                                            : 'https://example.com/product-video.mp4'
                                    }
                                    className={`${inputClassName} min-h-24 resize-y leading-6`}
                                />

                                <span className="block text-xs leading-5 text-text-muted">
                                    {isEditing
                                        ? 'Nhập URL mới để thay thế URL hiện tại.'
                                        : 'Có thể nhập nhiều URL, mỗi URL một dòng. Chỉ hỗ trợ HTTP/HTTPS, tối đa 20 URL mỗi lần.'}
                                </span>
                            </label>

                            {/* Preview URL */}
                            {mediaUrls.trim() && (
                                <div className="mt-4 overflow-hidden rounded-xl border border-border-default bg-bg-app p-3">
                                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-text-secondary">
                                        {mediaType === 'image' ? (
                                            <ImageIcon size={15} />
                                        ) : (
                                            <Film size={15} />
                                        )}
                                        Xem trước media đầu tiên
                                    </p>

                                    {mediaType === 'image' ? (
                                        <img
                                            src={mediaUrls
                                                .split(/\r?\n/)[0]
                                                .trim()}
                                            alt={
                                                altText ||
                                                'Xem trước media'
                                            }
                                            loading="lazy"
                                            className="max-h-56 w-full rounded-lg bg-bg-surface object-contain"
                                        />
                                    ) : (
                                        <div className="flex items-center gap-3 rounded-lg border border-border-default p-4">
                                            <Film
                                                size={24}
                                                className="shrink-0 text-accent-cyan"
                                            />

                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-text-primary">
                                                    Video sản phẩm
                                                </p>

                                                <p className="truncate text-xs text-text-muted">
                                                    {mediaUrls
                                                        .split(/\r?\n/)[0]
                                                        .trim()}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* NHÓM 5: UPLOAD FILE */}
                    {!isEditing &&
                        inputMode === 'upload' &&
                        mediaType === 'image' && (
                            <section className={sectionClassName}>
                                <div className="mb-4 flex items-center gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                                        <Upload size={18} />
                                    </span>

                                    <div>
                                        <h3 className="text-sm font-semibold text-text-primary">
                                            Upload hình ảnh
                                        </h3>
                                        <p className="mt-0.5 text-xs text-text-muted">
                                            Chọn ảnh từ thiết bị của bạn.
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-lg bg-bg-app p-2.5 text-center">
                                        <p className="text-sm font-semibold text-text-primary">
                                            20 ảnh
                                        </p>
                                        <p className="mt-1 text-[11px] text-text-muted">
                                            Tối đa mỗi lần
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-bg-app p-2.5 text-center">
                                        <p className="text-sm font-semibold text-text-primary">
                                            5MB
                                        </p>
                                        <p className="mt-1 text-[11px] text-text-muted">
                                            Mỗi ảnh
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-bg-app p-2.5 text-center">
                                        <p className="text-sm font-semibold text-text-primary">
                                            JPEG / PNG
                                        </p>
                                        <p className="mt-1 text-[11px] text-text-muted">
                                            WEBP / GIF
                                        </p>
                                    </div>
                                </div>

                                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-bg-app p-5 text-center transition-colors hover:border-accent-primary hover:bg-bg-elevated/50">
                                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                                        <Upload size={23} />
                                    </span>

                                    <span>
                                        <span className="block text-sm font-semibold text-text-primary">
                                            Nhấn để chọn ảnh
                                        </span>

                                        <span className="mt-1 block text-xs text-text-muted">
                                            Có thể chọn nhiều ảnh cùng lúc
                                        </span>
                                    </span>

                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        multiple
                                        disabled={
                                            saving ||
                                            selectedFiles.length >= MAX_FILES
                                        }
                                        onChange={handleSelectFiles}
                                        className="sr-only"
                                    />
                                </label>

                                {/* Danh sách ảnh đã chọn */}
                                {selectedFiles.length > 0 && (
                                    <div className="mt-5 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">
                                                    Ảnh đã chọn
                                                </p>

                                                <p className="mt-0.5 text-xs text-text-muted">
                                                    {selectedFiles.length}/{MAX_FILES} ảnh
                                                </p>
                                            </div>

                                            <p className="rounded-lg bg-bg-app px-3 py-2 text-xs font-medium text-text-secondary">
                                                {formatFileSize(totalFileSize)}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                            {selectedFiles.map(
                                                (item, index) => (
                                                    <div
                                                        key={`${item.file.name}-${item.file.lastModified}-${index}`}
                                                        className="group relative min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-app"
                                                    >
                                                        <div className="relative aspect-square">
                                                            <img
                                                                src={item.previewUrl}
                                                                alt={item.file.name}
                                                                className="h-full w-full object-cover"
                                                            />

                                                            <button
                                                                type="button"
                                                                disabled={saving}
                                                                onClick={() =>
                                                                    handleRemoveFile(index)
                                                                }
                                                                title="Bỏ ảnh này"
                                                                aria-label={`Bỏ ảnh ${item.file.name}`}
                                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/75 text-white transition-colors hover:bg-status-danger"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>

                                                        <div className="space-y-1 p-2.5">
                                                            <p
                                                                className="truncate text-xs font-medium text-text-primary"
                                                                title={item.file.name}
                                                            >
                                                                {item.file.name}
                                                            </p>

                                                            <p className="text-[11px] text-text-muted">
                                                                {formatFileSize(item.file.size)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                    {/* NHÓM 6: ALT TEXT */}
                    {(isEditing || inputMode === 'url') && (
                        <section className={sectionClassName}>
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-text-primary">
                                    Mô tả media
                                </h3>
                                <p className="mt-1 text-xs text-text-muted">
                                    Thông tin hỗ trợ khả năng truy cập và SEO.
                                </p>
                            </div>

                            <label className="block space-y-2">
                                <span className={labelClassName}>
                                    Alt text
                                </span>

                                <input
                                    value={altText}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setAltText(event.target.value)
                                    }
                                    maxLength={255}
                                    placeholder="VD: Nồi chiên không dầu nhìn từ phía trước"
                                    className={inputClassName}
                                />

                                <span className="block text-right text-xs text-text-muted">
                                    {altText.length}/255 ký tự
                                </span>
                            </label>
                        </section>
                    )}

                    {/* NHÓM 7: ẢNH CHÍNH */}
                    {mediaType === 'image' &&
                        (isEditing || inputMode === 'url') && (
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-strong">
                                <input
                                    type="checkbox"
                                    checked={isPrimary}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setIsPrimary(event.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4 accent-[#65D928]"
                                />

                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-text-primary">
                                        Đặt làm ảnh chính
                                    </span>

                                    <span className="mt-1 block text-xs leading-5 text-text-muted">
                                        {isEditing
                                            ? 'Ảnh này sẽ thay thế ảnh chính hiện tại của sản phẩm.'
                                            : 'Nếu nhập nhiều URL, chỉ URL đầu tiên được đánh dấu là ảnh chính.'}
                                    </span>
                                </span>
                            </label>
                        )}

                    {/* LƯU Ý UPLOAD */}
                    {inputMode === 'upload' && !isEditing && (
                        <div className="rounded-xl border border-border-default bg-bg-app px-4 py-3">
                            <p className="text-xs leading-5 text-text-muted">
                                Backend upload hiện tại tự tạo media và tự chọn
                                ảnh chính nếu sản phẩm chưa có ảnh chính.
                                Các trường Alt text và thứ tự hiển thị chưa
                                được gửi trong API upload.
                            </p>
                        </div>
                    )}
                </div>

                {/* FOOTER CỐ ĐỊNH - KHÔNG CUỘN THEO NỘI DUNG */}
                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border-default bg-bg-surface px-1 pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="hidden text-xs text-text-muted sm:block">
                        {isEditing
                            ? 'Kiểm tra thông tin trước khi lưu.'
                            : 'Vui lòng kiểm tra media trước khi thêm.'}
                    </p>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={saving}
                        >
                            Hủy
                        </Button>

                        <Button
                            type="submit"
                            loading={saving}
                            disabled={
                                !productId ||
                                products.length === 0 ||
                                saving ||
                                (inputMode === 'upload' &&
                                    !isEditing &&
                                    selectedFiles.length === 0)
                            }
                        >
                            {saving
                                ? 'Đang lưu...'
                                : isEditing
                                    ? 'Lưu thay đổi'
                                    : inputMode === 'upload'
                                        ? `Upload ${selectedFiles.length} ảnh`
                                        : 'Thêm media'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
