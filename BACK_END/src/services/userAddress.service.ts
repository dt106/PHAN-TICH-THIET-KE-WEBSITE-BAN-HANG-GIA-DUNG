
/**
 * FILE: BACK_END/src/services/userAddress.service.ts
 *
 * NHIỆM VỤ:
 * - Lấy danh sách địa chỉ giao hàng.
 * - Lấy chi tiết địa chỉ.
 * - Thêm địa chỉ mới.
 * - Cập nhật địa chỉ.
 * - Xóa địa chỉ.
 * - Đặt địa chỉ mặc định.
 *
 * NGUYÊN TẮC:
 * - Mỗi địa chỉ phải thuộc người dùng đang đăng nhập.
 * - Không cho phép truy cập địa chỉ của người khác.
 * - Không sử dụng userId do client tự gửi để xác định chủ sở hữu.
 */

import { Types } from "mongoose";
import { AppError } from "../utils/appError";

import UserAddress, {
  type IUserAddress,
} from "../models/UserAddress.model";

/**
 * Dữ liệu đầu vào khi tạo địa chỉ.
 */
export interface CreateUserAddressInput {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault?: boolean;
}

/**
 * Dữ liệu đầu vào khi cập nhật địa chỉ.
 */
export type UpdateUserAddressInput =
  Partial<CreateUserAddressInput>;

/**
 * Tạo lỗi có statusCode để middleware xử lý lỗi chung sử dụng.
 */
const throwError = (
  message: string,
  statusCode: number
): never => {
  throw new AppError(statusCode, message);
};

/**
 * Kiểm tra ID người dùng có hợp lệ hay không.
 */
const validateUserId = (userId: string): void => {
  if (!Types.ObjectId.isValid(userId)) {
    throwError("ID người dùng không hợp lệ.", 400);
  }
};

/**
 * Kiểm tra ID địa chỉ có hợp lệ hay không.
 */
const validateAddressId = (addressId: string): void => {
  if (!Types.ObjectId.isValid(addressId)) {
    throwError("ID địa chỉ không hợp lệ.", 400);
  }
};


/**
 * Tìm địa chỉ thuộc đúng người dùng.
 * Không tìm thấy thì ném lỗi 404.
 */


/**
 * Tìm địa chỉ thuộc đúng tài khoản đang đăng nhập.
 *
 * Không tìm thấy hoặc địa chỉ thuộc tài khoản khác:
 * trả về lỗi 404.
 */
const findOwnedAddress = async (
  userId: string,
  addressId: string
): Promise<IUserAddress> => {
  const address = await UserAddress.findOne({
    _id: addressId,
    userId,
  }).exec();

  if (!address) {
    return throwError(
      "Không tìm thấy địa chỉ giao hàng.",
      404
    );
  }

  return address;
};



/**
 * Bỏ trạng thái mặc định của các địa chỉ thuộc một người dùng.
 */
const clearDefaultAddress = async (
  userId: string
): Promise<void> => {
  await UserAddress.updateMany(
    {
      userId,
      isDefault: true,
    },
    {
      $set: {
        isDefault: false,
      },
    }
  ).exec();
};

/**
 * Lấy danh sách địa chỉ của người dùng.
 *
 * Địa chỉ mặc định được hiển thị trước.
 */
export const getUserAddressesService = async (
  userId: string
): Promise<IUserAddress[]> => {
  validateUserId(userId);

  return UserAddress.find({
    userId,
  })
    .sort({
      isDefault: -1,
      createdAt: -1,
    })
    .exec();
};

/**
 * Lấy chi tiết một địa chỉ.
 */
export const getUserAddressByIdService = async (
  userId: string,
  addressId: string
): Promise<IUserAddress> => {
  validateUserId(userId);
  validateAddressId(addressId);

  return findOwnedAddress(userId, addressId);
};

/**
 * Tạo địa chỉ mới.
 *
 * Quy tắc:
 * - Địa chỉ đầu tiên tự động là mặc định.
 * - Nếu isDefault = true, địa chỉ mới trở thành mặc định.
 * - Các địa chỉ mặc định cũ của người dùng bị bỏ mặc định.
 */
export const createUserAddressService = async (
  userId: string,
  input: CreateUserAddressInput
): Promise<IUserAddress> => {
  validateUserId(userId);

  const hasAddress = await UserAddress.exists({
    userId,
  });

  const shouldBeDefault =
    input.isDefault === true || !hasAddress;

  if (shouldBeDefault) {
    await clearDefaultAddress(userId);
  }

  const address = await UserAddress.create({
    userId,
    recipientName: input.recipientName,
    phone: input.phone,
    addressLine: input.addressLine,
    ward: input.ward ?? null,
    district: input.district ?? null,
    province: input.province ?? null,
    isDefault: shouldBeDefault,
  });

  return address;
};

/**
 * Cập nhật địa chỉ.
 *
 * Chỉ cập nhật các trường được cho phép.
 * Không cho phép thay đổi userId thông qua input.
 */
export const updateUserAddressService = async (
  userId: string,
  addressId: string,
  input: UpdateUserAddressInput
): Promise<IUserAddress> => {
  // BƯỚC 1: Kiểm tra ID.
  validateUserId(userId);
  validateAddressId(addressId);

  // BƯỚC 2: Tìm địa chỉ thuộc đúng người dùng.
  const address = await findOwnedAddress(
    userId,
    addressId
  );

  // BƯỚC 3: Xử lý yêu cầu đặt mặc định.
  if (input.isDefault === true) {
    await clearDefaultAddress(userId);
  }

  // BƯỚC 4: Cập nhật thông tin người nhận.
  if (input.recipientName !== undefined) {
    address.recipientName = input.recipientName;
  }

  if (input.phone !== undefined) {
    address.phone = input.phone;
  }

  if (input.addressLine !== undefined) {
    address.addressLine = input.addressLine;
  }

  if (input.ward !== undefined) {
    address.ward = input.ward;
  }

  if (input.district !== undefined) {
    address.district = input.district;
  }

  if (input.province !== undefined) {
    address.province = input.province;
  }

  // BƯỚC 5: Cập nhật trạng thái mặc định.
  if (input.isDefault === true) {
    address.isDefault = true;
  } else if (
    input.isDefault === false &&
    address.isDefault
  ) {
    // Nếu bỏ mặc định địa chỉ hiện tại,
    // chọn một địa chỉ khác làm mặc định nếu có.
    address.isDefault = false;
  }

  // BƯỚC 6: Lưu vào MongoDB.
  await address.save();

  // BƯỚC 7: Trả về document đã cập nhật.
  return address;
};

/**
 * Xóa địa chỉ.
 *
 * Nếu xóa địa chỉ mặc định:
 * - Tìm địa chỉ còn lại mới nhất.
 * - Đặt địa chỉ đó làm mặc định.
 *
 * Nếu không còn địa chỉ nào, không cần đặt mặc định.
 */
export const deleteUserAddressService = async (
  userId: string,
  addressId: string
): Promise<{ deleted: boolean }> => {
  validateUserId(userId);
  validateAddressId(addressId);

  const address = await findOwnedAddress(
    userId,
    addressId
  );

  const wasDefault = address.isDefault;

  await address.deleteOne();

  if (wasDefault) {
    const nextAddress = await UserAddress.findOne({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .exec();

    if (nextAddress) {
      await clearDefaultAddress(userId);

      nextAddress.isDefault = true;

      await nextAddress.save();
    }
  }

  return {
    deleted: true,
  };
};

/**
 * Đặt địa chỉ làm mặc định.
 *
 * Chỉ địa chỉ thuộc người dùng đang đăng nhập
 * mới được phép đặt mặc định.
 */
export const setDefaultUserAddressService = async (
  userId: string,
  addressId: string
): Promise<IUserAddress> => {
  validateUserId(userId);
  validateAddressId(addressId);

  // BƯỚC 1: Xác nhận quyền sở hữu địa chỉ.
  const address = await findOwnedAddress(
    userId,
    addressId
  );

  // BƯỚC 2: Bỏ mặc định các địa chỉ khác.
  await clearDefaultAddress(userId);

  // BƯỚC 3: Đặt địa chỉ được chọn làm mặc định.
  address.isDefault = true;

  // BƯỚC 4: Lưu thay đổi.
  await address.save();

  return address;
};
