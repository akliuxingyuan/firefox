/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#[cfg(feature = "malloc_size_of")]
use malloc_size_of::malloc_size_of_is_0;
#[cfg(feature = "num_traits")]
use num_traits::Zero;
#[cfg(feature = "serde_serialization")]
use serde::{Deserialize, Deserializer, Serialize};

use std::iter::Sum;
use std::{
    default::Default,
    fmt,
    ops::{Add, AddAssign, Div, DivAssign, Mul, MulAssign, Neg, Rem, Sub, SubAssign},
};

/// The number of app units in a pixel.
pub const AU_PER_PX: i32 = 60;
/// The minimum number of app units, same as in Gecko.
pub const MIN_AU: Au = Au(-((1 << 30) - 1));
/// The maximum number of app units, same as in Gecko.
///
/// (1 << 30) - 1 lets us add/subtract two Au and check for overflow after the operation.
pub const MAX_AU: Au = Au((1 << 30) - 1);

#[repr(transparent)]
#[derive(Clone, Copy, Hash, PartialEq, PartialOrd, Eq, Ord, Default)]
#[cfg_attr(feature = "serde_serialization", derive(Serialize), serde(transparent))]
/// An App Unit, the fundamental unit of length in Servo. Usually
/// 1/60th of a pixel (see `AU_PER_PX`)
///
/// Please ensure that the values are between `MIN_AU` and `MAX_AU`.
/// It is safe to construct invalid `Au` values, but it may lead to
/// panics and overflows.
pub struct Au(pub i32);

impl fmt::Debug for Au {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}px", self.to_f64_px())
    }
}

#[cfg(feature = "malloc_size_of")]
malloc_size_of_is_0!(Au);

#[cfg(feature = "serde_serialization")]
impl<'de> Deserialize<'de> for Au {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Au, D::Error> {
        Ok(Au(i32::deserialize(deserializer)?).clamp())
    }
}

#[cfg(feature = "num_traits")]
impl Zero for Au {
    #[inline]
    fn zero() -> Au {
        Au(0)
    }

    #[inline]
    fn is_zero(&self) -> bool {
        self.0 == 0
    }
}

impl Add for Au {
    type Output = Au;

    #[inline]
    fn add(self, other: Au) -> Au {
        Au(self.0 + other.0).clamp()
    }
}

impl Sub for Au {
    type Output = Au;

    #[inline]
    fn sub(self, other: Au) -> Au {
        Au(self.0 - other.0).clamp()
    }
}

impl Mul<Au> for i32 {
    type Output = Au;

    #[inline]
    fn mul(self, other: Au) -> Au {
        if let Some(new) = other.0.checked_mul(self) {
            Au(new).clamp()
        } else if (self > 0) ^ (other.0 > 0) {
            MIN_AU
        } else {
            MAX_AU
        }
    }
}

impl Mul<i32> for Au {
    type Output = Au;

    #[inline]
    fn mul(self, other: i32) -> Au {
        if let Some(new) = self.0.checked_mul(other) {
            Au(new).clamp()
        } else if (self.0 > 0) ^ (other > 0) {
            MIN_AU
        } else {
            MAX_AU
        }
    }
}

impl Div for Au {
    type Output = i32;

    #[inline]
    fn div(self, other: Au) -> i32 {
        self.0 / other.0
    }
}

impl Div<i32> for Au {
    type Output = Au;

    #[inline]
    fn div(self, other: i32) -> Au {
        Au(self.0 / other)
    }
}

impl Rem for Au {
    type Output = Au;

    #[inline]
    fn rem(self, other: Au) -> Au {
        Au(self.0 % other.0)
    }
}

impl Rem<i32> for Au {
    type Output = Au;

    #[inline]
    fn rem(self, other: i32) -> Au {
        Au(self.0 % other)
    }
}

impl Neg for Au {
    type Output = Au;

    #[inline]
    fn neg(self) -> Au {
        Au(-self.0)
    }
}

impl AddAssign for Au {
    #[inline]
    fn add_assign(&mut self, other: Au) {
        *self = (*self + other).clamp();
    }
}

impl SubAssign for Au {
    #[inline]
    fn sub_assign(&mut self, other: Au) {
        *self = (*self - other).clamp();
    }
}

impl MulAssign<i32> for Au {
    #[inline]
    fn mul_assign(&mut self, other: i32) {
        *self = (*self * other).clamp();
    }
}

impl DivAssign<i32> for Au {
    #[inline]
    fn div_assign(&mut self, other: i32) {
        *self = (*self / other).clamp();
    }
}

impl<'a> Sum<&'a Self> for Au {
    fn sum<I: Iterator<Item = &'a Self>>(iter: I) -> Self {
        iter.fold(Self::zero(), |a, b| a + *b)
    }
}

impl Sum<Self> for Au {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self::zero(), |a, b| a + b)
    }
}

impl Au {
    /// FIXME(pcwalton): Workaround for lack of cross crate inlining of newtype structs!
    #[inline]
    pub fn new(value: i32) -> Au {
        Au(value).clamp()
    }

    #[inline]
    fn clamp(self) -> Self {
        Ord::clamp(self, MIN_AU, MAX_AU)
    }

    #[inline]
    pub fn scale_by(self, factor: f32) -> Au {
        let new_float = ((self.0 as f64) * factor as f64).round();
        Au::from_f64_au(new_float)
    }

    #[inline]
    /// Scale, but truncate (useful for viewport-relative units)
    pub fn scale_by_trunc(self, factor: f32) -> Au {
        let new_float = ((self.0 as f64) * factor as f64).trunc();
        Au::from_f64_au(new_float)
    }

    #[inline]
    pub fn from_f64_au(float: f64) -> Self {
        // We *must* operate in f64. f32 isn't precise enough to handle MAX_AU
        Au(float.clamp(MIN_AU.0 as f64, MAX_AU.0 as f64) as i32)
    }

    #[inline]
    pub fn from_px(px: i32) -> Au {
        Au(px) * AU_PER_PX
    }

    /// Round this app unit down to the pixel towards zero and return it.
    #[inline]
    pub fn to_px(self) -> i32 {
        self.0 / AU_PER_PX
    }

    /// Ceil this app unit to the appropriate pixel boundary and return it.
    #[inline]
    pub fn ceil_to_px(self) -> i32 {
        ((self.0 as f64) / (AU_PER_PX as f64)).ceil() as i32
    }

    #[inline]
    pub fn to_nearest_px(self) -> i32 {
        ((self.0 as f64) / (AU_PER_PX as f64)).round() as i32
    }

    #[inline]
    pub fn to_nearest_pixel(self, pixels_per_px: f32) -> f32 {
        ((self.0 as f32) / (AU_PER_PX as f32) * pixels_per_px).round() / pixels_per_px
    }

    #[inline]
    pub fn to_f32_px(self) -> f32 {
        (self.0 as f32) / (AU_PER_PX as f32)
    }

    #[inline]
    pub fn to_f64_px(self) -> f64 {
        (self.0 as f64) / (AU_PER_PX as f64)
    }

    #[inline]
    pub fn from_f32_px(px: f32) -> Au {
        let float = (px * AU_PER_PX as f32).round();
        Au::from_f64_au(float as f64)
    }

    #[inline]
    pub fn from_f64_px(px: f64) -> Au {
        let float = (px * AU_PER_PX as f64).round();
        Au::from_f64_au(float)
    }

    #[inline]
    pub fn from_f32_px_trunc(px: f32) -> Au {
        let float = (px * AU_PER_PX as f32).trunc();
        Au::from_f64_au(float as f64)
    }

    #[inline]
    pub fn from_f64_px_trunc(px: f64) -> Au {
        let float = (px * AU_PER_PX as f64).trunc();
        Au::from_f64_au(float)
    }

    #[inline]
    pub fn abs(self) -> Self {
        Au(self.0.abs())
    }

    #[inline]
    pub fn max_assign(&mut self, other: Self) {
        *self = (*self).max(other);
    }

    #[inline]
    pub fn min_assign(&mut self, other: Self) {
        *self = (*self).min(other);
    }
}

#[test]
fn create() {
    assert_eq!(Au::zero(), Au(0));
    assert_eq!(Au::default(), Au(0));
    assert_eq!(Au::new(7), Au(7));
}

#[test]
fn operations() {
    assert_eq!(Au(7) + Au(5), Au(12));
    assert_eq!(MAX_AU + Au(1), MAX_AU);

    assert_eq!(Au(7) - Au(5), Au(2));
    assert_eq!(MIN_AU - Au(1), MIN_AU);

    assert_eq!(Au(7) * 5, Au(35));
    assert_eq!(5 * Au(7), Au(35));
    assert_eq!(MAX_AU * -1, MIN_AU);
    assert_eq!(MIN_AU * -1, MAX_AU);
    assert_eq!(-1 * MAX_AU, MIN_AU);
    assert_eq!(-1 * MIN_AU, MAX_AU);

    assert_eq!((Au(14) / 5) * 5 + Au(14) % 5, Au(14));
    assert_eq!((Au(14) / Au(5)) * Au(5) + Au(14) % Au(5), Au(14));

    assert_eq!(Au(35) / 5, Au(7));
    assert_eq!(Au(35) % 6, Au(5));

    assert_eq!(Au(35) / Au(5), 7);
    assert_eq!(Au(35) / Au(5), 7);

    assert_eq!(-Au(7), Au(-7));
}

#[test]
fn saturate() {
    let half = MAX_AU / 2;
    assert_eq!(half + half + half + half + half, MAX_AU);
    assert_eq!(-half - half - half - half - half, MIN_AU);
    assert_eq!(half * -10, MIN_AU);
    assert_eq!(-half * 10, MIN_AU);
    assert_eq!(half * 10, MAX_AU);
    assert_eq!(-half * -10, MAX_AU);
}

#[test]
fn scale() {
    assert_eq!(Au(12).scale_by(1.5), Au(18));
    assert_eq!(Au(12).scale_by(1.7), Au(20));
    assert_eq!(Au(12).scale_by(1.8), Au(22));
    assert_eq!(Au(12).scale_by_trunc(1.8), Au(21));
}

#[test]
fn abs() {
    assert_eq!(Au(-10).abs(), Au(10));
}

#[test]
fn convert() {
    assert_eq!(Au::from_px(5), Au(300));

    assert_eq!(Au(300).to_px(), 5);
    assert_eq!(Au(330).to_px(), 5);
    assert_eq!(Au(350).to_px(), 5);
    assert_eq!(Au(360).to_px(), 6);

    assert_eq!(Au(300).ceil_to_px(), 5);
    assert_eq!(Au(310).ceil_to_px(), 6);
    assert_eq!(Au(330).ceil_to_px(), 6);
    assert_eq!(Au(350).ceil_to_px(), 6);
    assert_eq!(Au(360).ceil_to_px(), 6);

    assert_eq!(Au(300).to_nearest_px(), 5);
    assert_eq!(Au(310).to_nearest_px(), 5);
    assert_eq!(Au(330).to_nearest_px(), 6);
    assert_eq!(Au(350).to_nearest_px(), 6);
    assert_eq!(Au(360).to_nearest_px(), 6);

    assert_eq!(Au(60).to_nearest_pixel(2.), 1.);
    assert_eq!(Au(70).to_nearest_pixel(2.), 1.);
    assert_eq!(Au(80).to_nearest_pixel(2.), 1.5);
    assert_eq!(Au(90).to_nearest_pixel(2.), 1.5);
    assert_eq!(Au(100).to_nearest_pixel(2.), 1.5);
    assert_eq!(Au(110).to_nearest_pixel(2.), 2.);
    assert_eq!(Au(120).to_nearest_pixel(2.), 2.);

    assert_eq!(Au(300).to_f32_px(), 5.);
    assert_eq!(Au(312).to_f32_px(), 5.2);
    assert_eq!(Au(330).to_f32_px(), 5.5);
    assert_eq!(Au(348).to_f32_px(), 5.8);
    assert_eq!(Au(360).to_f32_px(), 6.);
    assert_eq!((Au(367).to_f32_px() * 1000.).round(), 6_117.);
    assert_eq!((Au(368).to_f32_px() * 1000.).round(), 6_133.);

    assert_eq!(Au(300).to_f64_px(), 5.);
    assert_eq!(Au(312).to_f64_px(), 5.2);
    assert_eq!(Au(330).to_f64_px(), 5.5);
    assert_eq!(Au(348).to_f64_px(), 5.8);
    assert_eq!(Au(360).to_f64_px(), 6.);
    assert_eq!((Au(367).to_f64_px() * 1000.).round(), 6_117.);
    assert_eq!((Au(368).to_f64_px() * 1000.).round(), 6_133.);

    assert_eq!(Au::from_f32_px(5.), Au(300));
    assert_eq!(Au::from_f32_px(5.2), Au(312));
    assert_eq!(Au::from_f32_px(5.5), Au(330));
    assert_eq!(Au::from_f32_px(5.8), Au(348));
    assert_eq!(Au::from_f32_px(6.), Au(360));
    assert_eq!(Au::from_f32_px(6.12), Au(367));
    assert_eq!(Au::from_f32_px(6.13), Au(368));

    assert_eq!(Au::from_f64_px(5.), Au(300));
    assert_eq!(Au::from_f64_px(5.2), Au(312));
    assert_eq!(Au::from_f64_px(5.5), Au(330));
    assert_eq!(Au::from_f64_px(5.8), Au(348));
    assert_eq!(Au::from_f64_px(6.), Au(360));
    assert_eq!(Au::from_f64_px(6.12), Au(367));
    assert_eq!(Au::from_f64_px(6.13), Au(368));

    assert_eq!(Au::from_f32_px_trunc(5.0), Au(300));
    assert_eq!(Au::from_f32_px_trunc(5.2), Au(312));
    assert_eq!(Au::from_f32_px_trunc(5.5), Au(330));
    assert_eq!(Au::from_f32_px_trunc(5.8), Au(348));
    assert_eq!(Au::from_f32_px_trunc(6.), Au(360));
    assert_eq!(Au::from_f32_px_trunc(6.12), Au(367));
    assert_eq!(Au::from_f32_px_trunc(6.13), Au(367));

    assert_eq!(Au::from_f64_px_trunc(5.), Au(300));
    assert_eq!(Au::from_f64_px_trunc(5.2), Au(312));
    assert_eq!(Au::from_f64_px_trunc(5.5), Au(330));
    assert_eq!(Au::from_f64_px_trunc(5.8), Au(348));
    assert_eq!(Au::from_f64_px_trunc(6.), Au(360));
    assert_eq!(Au::from_f64_px_trunc(6.12), Au(367));
    assert_eq!(Au::from_f64_px_trunc(6.13), Au(367));
}

#[test]
fn max_assign() {
    let mut au = Au(5);
    au.max_assign(Au(10));
    assert_eq!(au, Au(10));

    let mut au = Au(5);
    au.max_assign(Au(-10));
    assert_eq!(au, Au(5));

    let mut au = Au(100);
    au.max_assign(MAX_AU);
    assert_eq!(au, MAX_AU);

    let mut au = Au(-100);
    au.max_assign(MAX_AU);
    assert_eq!(au, MAX_AU);
}

#[test]
fn min_assign() {
    let mut au = Au(5);
    au.min_assign(Au(10));
    assert_eq!(au, Au(5));

    let mut au = Au(5);
    au.min_assign(Au(-10));
    assert_eq!(au, Au(-10));

    let mut au = Au(100);
    au.min_assign(MAX_AU);
    assert_eq!(au, Au(100));

    let mut au = Au(-100);
    au.min_assign(MAX_AU);
    assert_eq!(au, Au(-100));
}

#[cfg(feature = "serde_serialization")]
#[test]
fn serialize() {
    let serialized = ron::to_string(&Au(42)).unwrap();
    assert_eq!(ron::from_str(&serialized), Ok(Au(42)));
}
