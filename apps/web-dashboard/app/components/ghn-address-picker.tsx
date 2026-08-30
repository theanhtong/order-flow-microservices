'use client';

import React, { useEffect, useState } from 'react';
import {
  fetchGhnProvincesApi,
  fetchGhnDistrictsApi,
  fetchGhnWardsApi,
  GhnProvince,
  GhnDistrict,
  GhnWard,
} from '../utils/shipping-api';

export interface GhnAddressValue {
  provinceId: number | '';
  districtId: number | '';
  wardCode: string;
  streetAddress: string;
  fullAddress: string;
}

interface GhnAddressPickerProps {
  value?: Partial<GhnAddressValue>;
  onChange: (val: GhnAddressValue) => void;
}

export default function GhnAddressPicker({ value, onChange }: GhnAddressPickerProps) {
  const [provinces, setProvinces] = useState<GhnProvince[]>([]);
  const [districts, setDistricts] = useState<GhnDistrict[]>([]);
  const [wards, setWards] = useState<GhnWard[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<number | ''>(value?.provinceId || '');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | ''>(value?.districtId || '');
  const [selectedWardCode, setSelectedWardCode] = useState<string>(value?.wardCode || '');
  const [streetAddress, setStreetAddress] = useState<string>(value?.streetAddress || '');

  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    const loadProvinces = async () => {
      setLoadingProvinces(true);
      const data = await fetchGhnProvincesApi();
      setProvinces(data);
      setLoadingProvinces(false);

      if (!selectedProvinceId && data.length > 0) {
        const hcm = data.find((p) => p.ProvinceName.includes('Hồ Chí Minh') || p.ProvinceName.includes('HCM'));
        const initProvId = hcm ? hcm.ProvinceID : data[0].ProvinceID;
        setSelectedProvinceId(initProvId);
      }
    };

    loadProvinces();
  }, []);

  useEffect(() => {
    if (!selectedProvinceId) {
      setDistricts([]);
      return;
    }

    const loadDistricts = async () => {
      setLoadingDistricts(true);
      const data = await fetchGhnDistrictsApi(Number(selectedProvinceId));
      setDistricts(data);
      setLoadingDistricts(false);
    };

    loadDistricts();
  }, [selectedProvinceId]);

  useEffect(() => {
    if (!selectedDistrictId) {
      setWards([]);
      return;
    }

    const loadWards = async () => {
      setLoadingWards(true);
      const data = await fetchGhnWardsApi(Number(selectedDistrictId));
      setWards(data);
      setLoadingWards(false);
    };

    loadWards();
  }, [selectedDistrictId]);

  useEffect(() => {
    const provObj = provinces.find((p) => p.ProvinceID === Number(selectedProvinceId));
    const distObj = districts.find((d) => d.DistrictID === Number(selectedDistrictId));
    const wardObj = wards.find((w) => w.WardCode === selectedWardCode);

    const fullAddrParts = [
      streetAddress.trim(),
      wardObj?.WardName,
      distObj?.DistrictName,
      provObj?.ProvinceName,
    ].filter(Boolean);

    onChange({
      provinceId: selectedProvinceId,
      districtId: selectedDistrictId,
      wardCode: selectedWardCode,
      streetAddress: streetAddress.trim(),
      fullAddress: fullAddrParts.join(', '),
    });
  }, [selectedProvinceId, selectedDistrictId, selectedWardCode, streetAddress, provinces, districts, wards]);

  const handleProvinceChange = (provId: number) => {
    setSelectedProvinceId(provId);
    setSelectedDistrictId('');
    setSelectedWardCode('');
    setWards([]);
  };

  const handleDistrictChange = (distId: number) => {
    setSelectedDistrictId(distId);
    setSelectedWardCode('');
  };

  return (
    <div className="space-y-4 font-mono">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] text-slate-500 font-medium block">
            Province / City *
          </label>
          <select
            value={selectedProvinceId}
            disabled={loadingProvinces}
            onChange={(e) => handleProvinceChange(Number(e.target.value))}
            className="w-full ui-input p-2.5 text-xs bg-white text-slate-900"
          >
            <option value="">Select Province / City...</option>
            {provinces.map((p) => (
              <option key={p.ProvinceID} value={p.ProvinceID}>
                {p.ProvinceName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-500 font-medium block">
            District *
          </label>
          <select
            value={selectedDistrictId}
            disabled={!selectedProvinceId || loadingDistricts}
            onChange={(e) => handleDistrictChange(Number(e.target.value))}
            className="w-full ui-input p-2.5 text-xs bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Select District...</option>
            {districts.map((d) => (
              <option key={d.DistrictID} value={d.DistrictID}>
                {d.DistrictName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-slate-500 font-medium block">
            Ward *
          </label>
          <select
            value={selectedWardCode}
            disabled={!selectedDistrictId || loadingWards}
            onChange={(e) => setSelectedWardCode(e.target.value)}
            className="w-full ui-input p-2.5 text-xs bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="">Select Ward...</option>
            {wards.map((w) => (
              <option key={w.WardCode} value={w.WardCode}>
                {w.WardName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] text-slate-500 font-medium block">
          Street Address / House Number *
        </label>
        <input
          type="text"
          value={streetAddress}
          onChange={(e) => setStreetAddress(e.target.value)}
          placeholder="e.g. 123 Nguyen Hue, Apartment 4B"
          className="w-full ui-input p-2.5 text-xs bg-white text-slate-900"
        />
      </div>
    </div>
  );
}
