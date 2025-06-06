/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const {
  roundtripEnumNoData,
  roundtripEnumWithData,
  roundtripComplexEnum,
  ComplexEnum,
  EnumNoData,
  EnumWithData,
  ExplicitValuedEnum,
  GappedEnum,
  SimpleRec,
} = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/tests/generated/RustUniffiBindingsTests.sys.mjs"
);

// Passing in a value outside the enum bounds should throw
Assert.throws(() => roundtripEnumNoData(EnumNoData.A - 1), /TypeError/);
Assert.throws(() => roundtripEnumNoData(EnumNoData.C + 1), /TypeError/);

Assert.deepEqual(
  roundtripEnumWithData(new EnumWithData.A({ value: 10 })),
  new EnumWithData.A({ value: 10 })
);
Assert.deepEqual(
  roundtripEnumWithData(new EnumWithData.B({ value: "Ten" })),
  new EnumWithData.B({ value: "Ten" })
);
Assert.deepEqual(
  roundtripEnumWithData(new EnumWithData.C({})),
  new EnumWithData.C({})
);

Assert.deepEqual(
  roundtripComplexEnum(new ComplexEnum.A({ value: EnumNoData.C })),
  new ComplexEnum.A({ value: EnumNoData.C })
);
Assert.deepEqual(
  roundtripComplexEnum(
    new ComplexEnum.B({ value: new EnumWithData.A({ value: 20 }) })
  ),
  new ComplexEnum.B({ value: new EnumWithData.A({ value: 20 }) })
);
Assert.deepEqual(
  roundtripComplexEnum(new ComplexEnum.C({ value: new SimpleRec({ a: 30 }) })),
  new ComplexEnum.C({ value: new SimpleRec({ a: 30 }) })
);

// Test that the enum discriminant values

// No discriminant specified, start at 0 then increment by 1
Assert.equal(EnumNoData.A, 0);
Assert.equal(EnumNoData.B, 1);
Assert.equal(EnumNoData.C, 2);

// All discriminants specified, use the specified values
Assert.equal(ExplicitValuedEnum.FIRST, 1);
Assert.equal(ExplicitValuedEnum.SECOND, 2);
Assert.equal(ExplicitValuedEnum.FOURTH, 4);
Assert.equal(ExplicitValuedEnum.TENTH, 10);
Assert.equal(ExplicitValuedEnum.ELEVENTH, 11);
Assert.equal(ExplicitValuedEnum.THIRTEENTH, 13);

// Some discriminants specified, increment by one for any unspecified variants
Assert.equal(GappedEnum.ONE, 10);
Assert.equal(GappedEnum.TWO, 11); // Sequential value after ONE (10+1)
Assert.equal(GappedEnum.THREE, 14); // Explicit value again
