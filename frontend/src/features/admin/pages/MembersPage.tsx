import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from "react";
import {
  getUsers,
  renewSubscription,
  type AdminUser,
} from "../../../services/api";
import subscriptionDurations from "../members/subscriptionDurations";
import MembersFilters from "../members/components/MembersFilters";
import MembersHeader from "../members/components/MembersHeader";
import MembersTable from "../members/components/MembersTable";
import { useMemberPhotoManager } from "../members/hooks/useMemberPhotoManager";

function MembersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const searchValueRef = useRef("");
  const allUsersRef = useRef<AdminUser[]>([]);
  const inFlightSearchRef = useRef("");
  const completedSearchRef = useRef("");
  const handledSearchSubmitRef = useRef(0);
  const [searchSubmitVersion, setSearchSubmitVersion] = useState(0);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [renewingUserId, setRenewingUserId] = useState<string | number | null>(
    null,
  );
  const [renewalDays, setRenewalDays] = useState("");
  const [renewalPrice, setRenewalPrice] = useState("");
  const [renewalError, setRenewalError] = useState("");
  const [renewalMessage, setRenewalMessage] = useState("");
  const [isRenewing, setIsRenewing] = useState(false);
  const normalizedSearch = search.trim();
  const isLoading = normalizedSearch
    ? isSearchLoading
    : isDirectoryLoading;
  const loadError = normalizedSearch ? searchError : directoryError;

  useEffect(() => {
    let isCurrentRequest = true;
    const controller = new AbortController();

    getUsers(undefined, controller.signal)
      .then((nextUsers) => {
        if (isCurrentRequest) {
          allUsersRef.current = nextUsers;
          if (!searchValueRef.current.trim()) {
            setUsers(nextUsers);
          }
          setDirectoryError("");
        }
      })
      .catch((error: unknown) => {
        if (isCurrentRequest && !controller.signal.aborted) {
          setDirectoryError(
            error instanceof Error ? error.message : "Could not load users.",
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsDirectoryLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const phone = normalizedSearch;
    if (!phone) {
      completedSearchRef.current = "";
      return;
    }

    if (!/^\d{1,11}$/.test(phone)) {
      completedSearchRef.current = "";
      return;
    }

    if (completedSearchRef.current !== phone) {
      completedSearchRef.current = "";
    }
    if (
      inFlightSearchRef.current === phone ||
      completedSearchRef.current === phone
    ) {
      return;
    }

    const submitImmediately =
      searchSubmitVersion !== handledSearchSubmitRef.current;
    handledSearchSubmitRef.current = searchSubmitVersion;
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      if (
        controller.signal.aborted ||
        inFlightSearchRef.current === phone ||
        completedSearchRef.current === phone
      ) {
        return;
      }

      setIsSearchLoading(true);
      setSearchError("");
      inFlightSearchRef.current = phone;
      getUsers(phone, controller.signal)
        .then((nextUsers) => {
          if (!controller.signal.aborted) {
            setUsers(nextUsers);
            completedSearchRef.current = phone;
          }
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setSearchError(
              error instanceof Error ? error.message : "Could not load users.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            if (inFlightSearchRef.current === phone) {
              inFlightSearchRef.current = "";
            }
            setIsSearchLoading(false);
          }
        });
    }, submitImmediately ? 0 : 450);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
      if (inFlightSearchRef.current === phone) {
        inFlightSearchRef.current = "";
      }
    };
  }, [normalizedSearch, searchSubmitVersion]);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    const phone = search.trim();
    if (
      /^\d{1,11}$/.test(phone) &&
      inFlightSearchRef.current !== phone &&
      completedSearchRef.current !== phone
    ) {
      setSearchError("");
      setIsSearchLoading(true);
      setSearchSubmitVersion((version) => version + 1);
    }
  }

  function handleSearchChange(value: string) {
    searchValueRef.current = value;
    setSearch(value);

    const phone = value.trim();
    if (!phone) {
      setSearchError("");
      setIsSearchLoading(false);
      setUsers(allUsersRef.current);
      return;
    }

    if (!/^\d{1,11}$/.test(phone)) {
      setSearchError("Search with 1 to 11 digits only.");
      setIsSearchLoading(false);
      setUsers([]);
      return;
    }

    setSearchError("");
    if (completedSearchRef.current === phone) {
      setIsSearchLoading(false);
      return;
    }
    setIsSearchLoading(true);
  }

  function handleRenewToggle(user: AdminUser) {
    setRenewalMessage("");
    setRenewalError("");
    setRenewalDays("");
    setRenewalPrice("");
    setRenewingUserId((current) =>
      current === user.id ? null : user.id,
    );
  }

  function handleRenewSubmit(
    event: FormEvent<HTMLFormElement>,
    user: AdminUser,
  ) {
    event.preventDefault();
    setRenewalError("");
    setRenewalMessage("");

    const subscriptionDays = Number(renewalDays);
    if (!subscriptionDurations.some((duration) => duration.days === subscriptionDays)) {
      setRenewalError("Select a subscription duration.");
      return;
    }

    const price = Number(renewalPrice);
    if (
      renewalPrice.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isInteger(price * 100)
    ) {
      setRenewalError("Enter a valid subscription price in EGP.");
      return;
    }

    setIsRenewing(true);
    renewSubscription(user.id, { subscriptionDays, price })
      .then(() => {
        setRenewalMessage(
          `${user.name} renewed for ${subscriptionDays / 30} month(s) (${subscriptionDays} days).`,
        );
        setRenewingUserId(null);
        setRenewalDays("");
        setRenewalPrice("");
      })
      .catch((error: unknown) => {
        setRenewalError(
          error instanceof Error ? error.message : "Could not renew subscription.",
        );
      })
      .finally(() => setIsRenewing(false));
  }

  function updateListedMemberPhoto(
    memberId: string,
    profilePhotoUrl: string | null,
  ) {
    const updatePhoto = (items: AdminUser[]) =>
      items.map((item) =>
        String(item.id) === memberId ? { ...item, profilePhotoUrl } : item,
      );

    allUsersRef.current = updatePhoto(allUsersRef.current);
    setUsers(updatePhoto);
  }

  const photoManager = useMemberPhotoManager(updateListedMemberPhoto);

  function handlePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
    member: AdminUser,
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) {
      void photoManager.upload(member, file);
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-white/10 bg-panel/70 p-5 sm:p-7">
      <MembersHeader count={users.length} />
      <MembersFilters
        search={search}
        searchError={searchError}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleSearchKeyDown}
      />
      <MembersTable
        users={users}
        search={search}
        isLoading={isLoading}
        error={loadError}
        renewalMessage={renewalMessage}
        renewingUserId={renewingUserId}
        renewalDays={renewalDays}
        renewalPrice={renewalPrice}
        renewalError={renewalError}
        isRenewing={isRenewing}
        busyMemberId={photoManager.busyMemberId}
        photoFeedback={photoManager.feedback}
        onRenewToggle={handleRenewToggle}
        onRenewDaysChange={setRenewalDays}
        onRenewPriceChange={setRenewalPrice}
        onRenewSubmit={handleRenewSubmit}
        onPhotoUpload={handlePhotoUpload}
        onPhotoRemove={(member) => void photoManager.remove(member)}
      />
    </section>
  );
}

export default MembersPage;
